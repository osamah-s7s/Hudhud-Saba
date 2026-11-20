import { validateAnswers, type Answers, type SubmitResponse } from "@/lib/answers";
import { buildSurveyEmail, cleanAnswers, getEmailConfig, sendSurveyEmail } from "@/lib/email";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";

/*
 * POST /api/submit — receives one survey response and emails it.
 *
 * Runtime: this app has `cacheComponents: true`, and in this Next.js version
 * Cache Components only runs on the Node.js runtime and does not allow a
 * `runtime` segment export (not even `runtime = 'nodejs'`). Node.js is the
 * default, so nodemailer works here without any export. A POST handler is
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

function isTooFast(startedAt: unknown, now: number): boolean {
  if (typeof startedAt !== "number" || !Number.isFinite(startedAt)) return false;
  const elapsed = now - startedAt;
  // Negative or very old values (bad client clock, stale tab) are not sane:
  // ignore them rather than risk dropping a real response.
  if (elapsed < 0 || elapsed > MAX_STARTED_AGE_MS) return false;
  return elapsed < MIN_FILL_MS;
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

  // Spam checks: answer "ok" so bots learn nothing, but send nothing.
  if (typeof website === "string" && website.trim() !== "") {
    console.info("[submit] dropped: honeypot filled");
    return json({ ok: true }, 200);
  }
  if (isTooFast(startedAt, Date.now())) {
    console.info("[submit] dropped: submitted too quickly");
    return json({ ok: true }, 200);
  }

  const validation = validateAnswers(answers);
  if (!validation.ok) {
    return json({ ok: false, error: "validation", fields: validation.fields }, 400);
  }

  const configResult = getEmailConfig();
  if (!configResult.ok) {
    console.error(
      `[submit] email not configured; missing or invalid env vars: ${configResult.problems.join(", ")}`,
    );
    return json({ ok: false, error: "not_configured" }, 503);
  }

  const email = buildSurveyEmail(cleanAnswers(answers as Answers));
  try {
    // Awaited: a serverless function may be frozen once the response is sent.
    await sendSurveyEmail(configResult.config, email);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[submit] send failed: ${message}`);
    return json({ ok: false, error: "send_failed" }, 502);
  }

  return json({ ok: true }, 200);
}
