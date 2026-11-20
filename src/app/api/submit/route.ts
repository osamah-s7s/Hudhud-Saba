import { validateAnswers, type Answers, type SubmitResponse } from "@/lib/answers";
import { buildSurveyEmail, cleanAnswers, getEmailConfig, sendSurveyEmail } from "@/lib/email";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import { missingSupabaseEnv, saveResponse } from "@/lib/responses";

/*
 * POST /api/submit — receives one survey response and stores it.
 *
 * The response is saved to Supabase first; that row is the source of truth
 * (the admin panel at /admin reads it). Email is an optional extra copy: when
 * SMTP is configured the response is also emailed, but a missing SMTP setup
 * or a failed send never fails a request whose row is already saved.
 *
 * Runtime: this app has `cacheComponents: true`, and in this Next.js version
 * Cache Components only runs on the Node.js runtime and does not allow a
 * `runtime` segment export (not even `runtime = 'nodejs'`). Node.js is the
 * default, so nodemailer and the Supabase client work here without any export. A POST handler is
 * never prerendered or cached, so the route is always a request-time
 * function. Only POST is exported; Next.js answers other methods with 405.
 */

const MAX_BODY_BYTES = 20 * 1024;
/** Submissions faster than this after pressing Begin are treated as bots. */
const MIN_FILL_MS = 3_000;
/** Accept startedAt only within this age; anything else is ignored, never blocked. */
const MAX_STARTED_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Best-effort, per-instance (see src/lib/rate-limit.ts for the limitation).
const rateLimit = createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000, maxKeys: 5_000 });

function json(body: SubmitResponse, status: number, headers: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

const badRequest = () => json({ ok: false, error: "bad_request" }, 400);

/** Reads the body as text, giving up as soon as it exceeds `limit` bytes. */
async function readBodyLimited(request: Request, limit: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** Milliseconds since the visitor pressed Begin, or null when `startedAt` is not sane. */
function saneElapsedMs(startedAt: unknown, now: number): number | null {
  if (typeof startedAt !== "number" || !Number.isFinite(startedAt)) return null;
  const elapsed = now - startedAt;
  // Negative or very old values (bad client clock, stale tab) are not sane:
  // ignore them rather than risk dropping a real response.
  if (elapsed < 0 || elapsed > MAX_STARTED_AGE_MS) return null;
  return elapsed;
}

function isTooFast(elapsedMs: number | null): boolean {
  return elapsedMs !== null && elapsedMs < MIN_FILL_MS;
}

export async function POST(request: Request) {
  const limited = rateLimit(clientIp(request.headers));
  if (!limited.allowed) {
    return json({ ok: false, error: "rate_limited" }, 429, {
      "Retry-After": String(limited.retryAfterSeconds),
    });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json\s*(;|$)/i.test(contentType)) return badRequest();

  const raw = await readBodyLimited(request, MAX_BODY_BYTES);
  if (raw === null) return badRequest();

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return badRequest();
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return badRequest();
  }
  const { answers, website, startedAt } = payload as Record<string, unknown>;

  // Spam checks: answer "ok" so bots learn nothing, but store and send nothing.
  if (typeof website === "string" && website.trim() !== "") {
    console.info("[submit] dropped: honeypot filled");
    return json({ ok: true }, 200);
  }
  const elapsedMs = saneElapsedMs(startedAt, Date.now());
  if (isTooFast(elapsedMs)) {
    console.info("[submit] dropped: submitted too quickly");
    return json({ ok: true }, 200);
  }

  const validation = validateAnswers(answers);
  if (!validation.ok) {
    return json({ ok: false, error: "validation", fields: validation.fields }, 400);
  }

  const missing = missingSupabaseEnv();
  if (missing.length > 0) {
    console.error(`[submit] storage not configured; missing env vars: ${missing.join(", ")}`);
    return json({ ok: false, error: "not_configured" }, 503);
  }

  const cleaned = cleanAnswers(answers as Answers);
  // Whole seconds; null when the client clock gave nothing usable. Bounded by
  // MAX_STARTED_AGE_MS, so it always fits the integer column.
  const durationSeconds = elapsedMs === null ? null : Math.round(elapsedMs / 1000);

  try {
    await saveResponse(cleaned, durationSeconds);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[submit] save failed: ${message}`);
    return json({ ok: false, error: "send_failed" }, 502);
  }

  // From here on the response is safely stored: nothing below may fail the request.
  const configResult = getEmailConfig();
  if (!configResult.ok) {
    console.info(
      `[submit] saved; email copy skipped, SMTP not configured (missing or invalid: ${configResult.problems.join(", ")})`,
    );
    return json({ ok: true }, 200);
  }

  try {
    // Awaited: a serverless function may be frozen once the response is sent.
    await sendSurveyEmail(configResult.config, buildSurveyEmail(cleaned));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[submit] saved, but the email copy failed: ${message}`);
  }

  return json({ ok: true }, 200);
}
