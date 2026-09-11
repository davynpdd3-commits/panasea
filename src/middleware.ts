import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/jwt";

/**
 * Route protection — UX layer only.
 *
 * This runs on the Edge runtime, so it can only check "is there a validly
 * signed, unexpired token" (via jose, no database access). It cannot check
 * `isActive` or permissions — that requires Prisma, which only runs in the
 * Node runtime. Real authorization happens in API routes and server
 * components via requireSession()/requirePermission() (src/lib/auth), which
 * DO hit the database on every call. This middleware only exists so an
 * unauthenticated visitor is redirected to /login instead of momentarily
 * seeing protected UI before a 401 comes back.
 */

const PUBLIC_PATHS = new Set(["/login"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const userId = await verifySessionToken(token);
  const isAuthenticated = Boolean(userId);
  const isPublicPath = PUBLIC_PATHS.has(pathname);

  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Run only on page routes, never on /api/* — API routes enforce
     * their own authorization via requireSession()/requirePermission()
     * (see src/app/api/users/route.ts for an example) and must return a
     * proper JSON 401/403, not get redirected to an HTML login page.
     * This middleware's redirect is purely a page-navigation UX nicety.
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
