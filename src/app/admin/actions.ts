"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_HOME,
  ADMIN_LOGIN,
  clearSession,
  createSession,
  verifyCredentials,
} from "@/lib/admin-auth";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";

/*
 * Server Actions for the admin area. Each one is a public POST endpoint, so
 * each one checks what it needs itself and trusts nothing from the client.
 */

export type LoginState =
  | {
      error: string;
      /** Echoed back so the username field survives a failed attempt. */
      username?: string;
    }
  | undefined;

const MAX_FIELD_LENGTH = 256;

// Brute-force brake: 8 attempts per 10 minutes per client IP. Best-effort and
// per instance (see src/lib/rate-limit.ts for the limitation).
const loginRateLimit = createRateLimiter({ limit: 8, windowMs: 10 * 60 * 1000, maxKeys: 5_000 });

function waitText(seconds: number): string {
  if (seconds < 60) return "a minute";
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minutes`;
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const rawUsername = formData.get("username");
  const rawPassword = formData.get("password");
  const username = typeof rawUsername === "string" ? rawUsername.trim() : "";
  const password = typeof rawPassword === "string" ? rawPassword : "";
  const echo = username.slice(0, MAX_FIELD_LENGTH);

  const limited = loginRateLimit(clientIp(await headers()));
  if (!limited.allowed) {
    return {
      error: `Too many sign-in attempts. Please wait ${waitText(limited.retryAfterSeconds)} and try again.`,
      username: echo,
    };
  }

  if (!username || !password) {
    return { error: "Enter your username and password.", username: echo };
  }

  const check =
    username.length > MAX_FIELD_LENGTH || password.length > MAX_FIELD_LENGTH
      ? "invalid"
      : verifyCredentials(username, password);

  if (check === "not_configured") {
    return {
      error: "Admin is not configured on this server, so sign-in is unavailable.",
      username: echo,
    };
  }
  if (check !== "ok") {
    // Never says which of the two was wrong.
    return { error: "Incorrect username or password.", username: echo };
  }

  await createSession();
  redirect(ADMIN_HOME);
}

export async function logout(): Promise<void> {
  await clearSession();
  redirect(ADMIN_LOGIN);
}
