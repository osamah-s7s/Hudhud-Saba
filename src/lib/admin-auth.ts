import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

/*
 * Admin authentication: ONE account, configured through environment
 * variables, with a stateless signed session cookie. There is no sign-up and
 * no user table.
 *
 *   ADMIN_USERNAME / ADMIN_PASSWORD   the single account
 *   ADMIN_SESSION_SECRET              HMAC key material (>= 32 characters)
 *
 * Token format:  v1.<expiry ms since epoch>.<base64url HMAC-SHA256>
 * The MAC covers "v1.<expiry>". Its key is derived from the secret AND the
 * current credentials, so changing the password (or the secret) signs every
 * existing session out.
 *
 * Runtime: Node.js (node:crypto). Cache Components does not allow a `runtime`
 * export, and Node.js is the default, so nothing is exported for it.
 *
 * Cache Components: isAdmin() / requireAdmin() read cookies(), which is
 * request-time data. In a page or layout they must be awaited inside a
 * <Suspense> boundary (see src/app/admin/login/page.tsx for the pattern).
 */

export const ADMIN_COOKIE = "hs_admin";
/** The cookie is only sent to /admin and below, never to the public site or /api. */
export const ADMIN_COOKIE_PATH = "/admin";
export const ADMIN_HOME = "/admin";
export const ADMIN_LOGIN = "/admin/login";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_VERSION = "v1";
const MIN_SECRET_LENGTH = 32;
/** Longest token we are willing to look at: "v1." + 13 digits + "." + 43 chars. */
const MAX_TOKEN_LENGTH = 128;

interface AdminConfig {
  username: string;
  password: string;
  secret: string;
}

type AdminConfigResult = { ok: true; config: AdminConfig } | { ok: false; problems: string[] };

/**
 * Reads the three variables. `problems` holds variable NAMES only (plus a
 * short reason), never values, so it is safe to log.
 */
export function getAdminConfig(): AdminConfigResult {
  const username = process.env.ADMIN_USERNAME ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";

  const problems: string[] = [];
  if (!username) problems.push("ADMIN_USERNAME");
  if (!password) problems.push("ADMIN_PASSWORD");
  if (!secret) problems.push("ADMIN_SESSION_SECRET");
  else if (secret.length < MIN_SECRET_LENGTH) {
    problems.push(`ADMIN_SESSION_SECRET (shorter than ${MIN_SECRET_LENGTH} characters)`);
  }

  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, config: { username, password, secret } };
}

const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest();

/** Constant-time string comparison. Hashing first means lengths do not leak. */
function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

export type CredentialCheck = "ok" | "invalid" | "not_configured";

/** Checks a login attempt against the configured account. Fails closed. */
export function verifyCredentials(username: string, password: string): CredentialCheck {
  const result = getAdminConfig();
  if (!result.ok) {
    console.error(
      `[admin] login refused: admin is not configured; missing or invalid env vars: ${result.problems.join(", ")}`,
    );
    return "not_configured";
  }
  // Both comparisons always run: no early exit that would reveal which one failed.
  const usernameOk = safeEqual(username, result.config.username);
  const passwordOk = safeEqual(password, result.config.password);
  return usernameOk && passwordOk ? "ok" : "invalid";
}

function signingKey({ username, password, secret }: AdminConfig): Buffer {
  const credentials = createHash("sha256")
    .update(username, "utf8")
    .update("\0")
    .update(password, "utf8")
    .digest();
  return createHmac("sha256", secret).update("hs_admin:session:v1\0").update(credentials).digest();
}

function sign(payload: string, config: AdminConfig): Buffer {
  return createHmac("sha256", signingKey(config)).update(payload, "utf8").digest();
}

function createSessionToken(config: AdminConfig, expiresAt: number): string {
  const payload = `${TOKEN_VERSION}.${expiresAt}`;
  return `${payload}.${sign(payload, config).toString("base64url")}`;
}

/**
 * True only for a token with a valid signature that has not expired. Pure
 * (no cookies/headers), so the proxy can use it for its optimistic check.
 */
export function verifySessionToken(token: string | undefined, now: number): boolean {
  if (!token || token.length > MAX_TOKEN_LENGTH) return false;

  const result = getAdminConfig();
  if (!result.ok) return false; // fail closed; the login action logs the reason

  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, expiry, signature] = parts;
  if (version !== TOKEN_VERSION || !/^[1-9]\d{0,14}$/.test(expiry)) return false;

  const expected = sign(`${version}.${expiry}`, result.config);
  const given = Buffer.from(signature, "base64url");
  // timingSafeEqual needs equal lengths; the length of a SHA-256 MAC is public.
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;

  const expiresAt = Number(expiry);
  // Signed already, but still refuse anything expired or dated impossibly far ahead.
  return expiresAt > now && expiresAt <= now + SESSION_TTL_MS + 60_000;
}

/** Sets the session cookie. Server Functions and Route Handlers only. */
export async function createSession(): Promise<void> {
  const result = getAdminConfig();
  if (!result.ok) throw new Error("Admin is not configured.");

  const expiresAt = Date.now() + SESSION_TTL_MS;
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, createSessionToken(result.config, expiresAt), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: ADMIN_COOKIE_PATH,
    expires: new Date(expiresAt),
  });
}

/** Removes the session cookie. Server Functions and Route Handlers only. */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  // Same name + path as when it was set, or the browser keeps the old cookie.
  cookieStore.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: ADMIN_COOKIE_PATH,
    maxAge: 0,
  });
}

/**
 * Whether this request carries a valid admin session. Memoized per render
 * pass; in Server Actions and Route Handlers every call re-checks.
 */
export const isAdmin = cache(async (): Promise<boolean> => {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  // The expiry check reads the clock. Under Cache Components that is only
  // legal once the render is tied to a live request: cookies() alone is not
  // enough (Next logs "encountered the unstable value Date.now()"), so wait
  // for connection() first. Consequence: never wrap this in `use cache`.
  await connection();
  return verifySessionToken(token, Date.now());
});

/**
 * Gate for admin pages, Server Actions and Route Handlers: redirects to the
 * login page unless the request carries a valid session. Call it before
 * reading any admin data, in the same component or function that reads it.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect(ADMIN_LOGIN);
}
