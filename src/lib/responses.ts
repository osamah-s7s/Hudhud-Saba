import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sanitizeAnswers, type Answers } from "@/lib/answers";

/*
 * Survey responses in Supabase (table public.survey_responses). This is the
 * source of truth for what visitors submitted.
 *
 * Server-only: SUPABASE_URL and SUPABASE_SECRET_KEY are read from process.env
 * at request time and neither is NEXT_PUBLIC_, so they never reach the
 * browser bundle. The secret key bypasses Row Level Security (the table has
 * RLS enabled with no policies, so nothing else can read or write it), which
 * is why this module must only ever be imported from server code: route
 * handlers, Server Components, Server Functions. Never import it from a
 * "use client" file. Values of the two variables are never logged or returned.
 *
 * A stored row holds the answers, the time it was saved and how long the form
 * took to fill. No IP address, user agent or name is stored (the survey
 * promises respondents anonymity).
 *
 * Nothing here is cached: there is no "use cache", and with Cache Components
 * the client's fetch calls run at request time, so the admin always sees the
 * current rows.
 */

export interface StoredResponse {
  id: string;
  /** ISO 8601 timestamp of when the row was saved. */
  createdAt: string;
  answers: Answers;
  /** Seconds between pressing Begin and submitting; null when unknown. */
  durationSeconds: number | null;
}

const TABLE = "survey_responses";
const COLUMNS = "id, created_at, answers, duration_seconds";
/** Supabase returns at most 1000 rows per request by default; page in that size. */
const PAGE_SIZE = 1000;
/** Largest value a Postgres `integer` column accepts. */
const MAX_INT4 = 2_147_483_647;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

/** Variable NAMES that are missing, never values. Empty when fully configured. */
export function missingSupabaseEnv(): string[] {
  return ["SUPABASE_URL", "SUPABASE_SECRET_KEY"].filter((name) => !env(name));
}

export function isSupabaseConfigured(): boolean {
  return missingSupabaseEnv().length === 0;
}

let cached: { key: string; client: SupabaseClient } | null = null;

/** Created lazily on first use and reused while the function instance is warm. */
function getClient(): SupabaseClient {
  const url = env("SUPABASE_URL");
  const secretKey = env("SUPABASE_SECRET_KEY");
  if (!url || !secretKey) {
    throw new Error(`Supabase is not configured; missing: ${missingSupabaseEnv().join(", ")}`);
  }
  const key = `${url}\u0000${secretKey}`;
  if (cached?.key === key) return cached.client;

  const client = createClient(url, secretKey, {
    // A server process acting with the secret key has no user session to
    // store or refresh.
    auth: { persistSession: false, autoRefreshToken: false },
  });
  cached = { key, client };
  return client;
}

/** Turns one database row into the shape the admin uses, trusting nothing. */
function toStoredResponse(row: Record<string, unknown>): StoredResponse {
  const created = new Date(String(row.created_at));
  const duration = row.duration_seconds;
  return {
    id: String(row.id),
    // Postgres returns e.g. "2026-01-01T10:00:00.123456+00:00"; normalise to
    // the plain ISO form. An unreadable value is passed through unchanged
    // rather than throwing away the whole row.
    createdAt: Number.isNaN(created.getTime()) ? String(row.created_at) : created.toISOString(),
    // Rows may have been written by an older version of the survey (or edited
    // by hand in the dashboard): keep only answers that are still well-formed.
    answers: sanitizeAnswers(row.answers),
    durationSeconds:
      typeof duration === "number" && Number.isInteger(duration) && duration >= 0
        ? duration
        : null,
  };
}

/**
 * Saves one response. `answers` must already be validated and cleaned by the
 * caller. Throws on failure; the error message never contains the secret key.
 */
export async function saveResponse(
  answers: Answers,
  durationSeconds: number | null,
): Promise<void> {
  // The column is `integer check (>= 0)`: anything else becomes null instead
  // of making the insert fail and losing the response.
  const duration =
    typeof durationSeconds === "number" &&
    Number.isInteger(durationSeconds) &&
    durationSeconds >= 0 &&
    durationSeconds <= MAX_INT4
      ? durationSeconds
      : null;

  const { error } = await getClient()
    .from(TABLE)
    .insert({ answers, duration_seconds: duration });
  if (error) throw new Error(`Supabase insert failed: ${error.message}`);
}

/** Every stored response, newest first. Not cached. Throws on failure. */
export async function listResponses(): Promise<StoredResponse[]> {
  const client = getClient();
  const out: StoredResponse[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from(TABLE)
      .select(COLUMNS)
      .order("created_at", { ascending: false })
      // Tie-breaker so paging stays stable when two rows share a timestamp.
      .order("id", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Supabase select failed: ${error.message}`);

    const rows = (data ?? []) as Record<string, unknown>[];
    for (const row of rows) out.push(toStoredResponse(row));
    if (rows.length < PAGE_SIZE) break;
  }

  // A response saved while paging shifts later pages by one and can repeat a
  // row; keep the first occurrence only.
  const seen = new Set<string>();
  return out.filter((row) => (seen.has(row.id) ? false : (seen.add(row.id), true)));
}

/**
 * Deletes one response by id. Deleting an id that no longer exists is not an
 * error (a repeated click must not fail). Throws on a malformed id or a
 * database failure.
 */
export async function deleteResponse(id: string): Promise<void> {
  // Checked here, not left to Postgres, so a bad value never reaches the query.
  if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
    throw new Error("Invalid response id");
  }
  const { error } = await getClient().from(TABLE).delete().eq("id", id);
  if (error) throw new Error(`Supabase delete failed: ${error.message}`);
}
