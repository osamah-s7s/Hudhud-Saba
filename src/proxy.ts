import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, ADMIN_HOME, ADMIN_LOGIN, verifySessionToken } from "@/lib/admin-auth";

/*
 * Optimistic check for /admin only (the public site never runs this).
 *
 * With Cache Components a page's own redirect() is streamed after the
 * response has already started with a 200. Checking the cookie here first
 * gives signed-out visitors a real 307 to the login page before anything
 * renders. This is a convenience, NOT the security boundary: every admin
 * page, Server Action and Route Handler still calls requireAdmin() itself.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === ADMIN_LOGIN;
  const isRead = request.method === "GET" || request.method === "HEAD";

  // Server Action POSTs pass through untouched; the actions authorize themselves.
  if (isRead) {
    const token = request.cookies.get(ADMIN_COOKIE)?.value;
    const signedIn = verifySessionToken(token, Date.now());
    // Signed out -> login page; already signed in -> skip the login page.
    if (signedIn === isLogin) {
      const target = signedIn ? ADMIN_HOME : ADMIN_LOGIN;
      const response = NextResponse.redirect(new URL(target, request.url));
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
  }

  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
