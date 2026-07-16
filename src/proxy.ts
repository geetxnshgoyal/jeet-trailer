import { NextRequest, NextResponse } from "next/server";

/**
 * Edge proxy (Next 16's renamed middleware) for coarse route protection.
 *
 * This performs a *presence* check on the session cookie only — it does NOT
 * verify the cookie (the Firebase Admin SDK isn't available on the Edge
 * runtime). Authoritative verification happens in server components/route
 * handlers via getCurrentUser(). The goal here is purely to bounce obviously
 * unauthenticated visitors away from app pages and signed-in users away from
 * the login screen, avoiding a flash of protected UI.
 */

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "jt_session";

// Paths that never require auth.
const PUBLIC_PATHS = ["/login"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(COOKIE_NAME)?.value);
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // Signed-in user hitting the login page → send to dashboard.
  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Unauthenticated user hitting a protected page → send to login with a
  // `next` param so we can return them where they were headed.
  if (!hasSession && !isPublic) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals, API routes (they guard
  // themselves), and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
