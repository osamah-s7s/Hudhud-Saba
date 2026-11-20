import { redirect } from "next/navigation";
import { connection } from "next/server";
import { LoginForm } from "@/components/admin/LoginForm";
import { Ornament } from "@/components/icons";
import { ADMIN_HOME, isAdmin } from "@/lib/admin-auth";

/*
 * Rendered entirely at request time, on purpose.
 *
 * The usual Cache Components pattern (static shell + the cookie read inside
 * <Suspense>) was tried first and builds fine, but with a partially
 * prerendered page the response to a native form POST — a sign-in submitted
 * before the page has hydrated, e.g. by a password manager — contains only
 * the streamed part and no document, so a failed sign-in showed a blank page.
 * A fully dynamic page always answers with the whole document.
 *
 * `instant = false` is the documented opt-out that allows a page to block on
 * request-time data without a <Suspense> boundary. There is nothing worth
 * prerendering here anyway.
 */
export const instant = false;

export default async function AdminLoginPage() {
  await connection();
  // Fallback only: src/proxy.ts already redirects signed-in visitors with a real 307.
  if (await isAdmin()) redirect(ADMIN_HOME);

  return (
    <main className="admin-login-glow flex min-h-dvh flex-col items-center justify-center px-5 py-16">
      <div className="w-full max-w-[24rem]">
        <Ornament lines={false} size={22} />
        <p className="kicker mt-8 text-center text-[0.6875rem]">Hudhud Saba</p>
        <h1 className="mt-4 text-center font-serif text-[clamp(2.25rem,1.9rem+1.6vw,2.75rem)] leading-tight font-medium text-sand">
          Admin sign in
        </h1>
        <p className="mt-4 text-center text-[0.9375rem] leading-[1.7] text-muted">
          Survey responses are private. Sign in to view them.
        </p>

        <LoginForm />
      </div>
    </main>
  );
}
