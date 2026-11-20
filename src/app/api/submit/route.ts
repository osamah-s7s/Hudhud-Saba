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

// Best-effort, per-instance (see src/lib/rate-limit.ts for the limitation).
// The limit is generous on purpose: a whole class answering from one campus
// network shares a single public IP address.
const rateLimit = createRateLimiter({ limit: 30, windowMs: 10 * 60 * 1000, maxKeys: 5_000 });

/**
 * Ids of responses already emailed by this instance, so a retry after a
 * dropped connection does not email the same response twice. Best-effort,
 * like the rate limit; the id is also printed in the email so any duplicate
 * that slips through can be spotted.
 */
const SENT_TTL_MS = 60 * 60 * 1000;
const SENT_MAX = 2_000;
const sentIds = new Map<string, number>();

function alreadySent(id: string, now: number): boolean {
  const at = sentIds.get(id);
  return at !== undefined && at > now - SENT_TTL_MS;
}

function rememberSent(id: string, now: number) {
  sentIds.set(id, now);
  if (sentIds.size <= SENT_MAX) return;
  for (const [key, at] of sentIds) {
    if (at <= now - SENT_TTL_MS || sentIds.size > SENT_MAX) sentIds.delete(key);
    else break;
  }
}

const isSubmissionId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9-]{8,64}$/.test(value);

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

export async function POST(request: Request) {
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
  const { answers, website, submissionId } = payload as Record<string, unknown>;

  // Spam checks: answer "ok" so bots learn nothing, but send nothing.
  if (typeof website === "string" && website.trim() !== "") {
    console.info("[submit] dropped: honeypot filled");
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

  const responseId = isSubmissionId(submissionId) ? submissionId : null;
  if (responseId && alreadySent(responseId, Date.now())) {
    // A retry of a response that was already emailed: report success, send nothing.
    return json({ ok: true }, 200);
  }

  // Only requests that would actually send an email count against the limit,
  // so malformed or rejected attempts never lock a real visitor out.
  const limited = rateLimit(clientIp(request.headers));
  if (!limited.allowed) {
    return json({ ok: false, error: "rate_limited" }, 429, {
      "Retry-After": String(limited.retryAfterSeconds),
    });
  }

  const email = buildSurveyEmail(cleanAnswers(answers as Answers), new Date(), responseId);
  try {
    // Awaited: a serverless function may be frozen once the response is sent.
    await sendSurveyEmail(configResult.config, email);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[submit] send failed: ${message}`);
    return json({ ok: false, error: "send_failed" }, 502);
  }

  if (responseId) rememberSent(responseId, Date.now());
  return json({ ok: true }, 200);
}
