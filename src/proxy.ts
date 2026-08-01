import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const session = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  const { pathname, search } = request.nextUrl;
  const onLoginPage = pathname === "/login";

  if (!session && !onLoginPage) {
    // API routes get a 401, not a redirect: a fetch() follows redirects, so a
    // bounce to /login would resolve as HTML with a 200 and look like success.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    // Remember where they were headed so login can bounce them back.
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (session && onLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Matches everything except the public landing page (`$`), the auth endpoints,
  // and static assets. Listing what's public and matching the rest means a new
  // route is private by default.
  //
  // `/login` is deliberately INCLUDED so the signed-in-user redirect above can
  // fire; the handler returns next() for signed-out visitors, so it stays
  // reachable.
  matcher: [
    // Icons are excluded by EXTENSION, not by name. `.svg` was already here, which is
    // why /icon.svg worked and /apple-icon.png did not — it was gated, so the request
    // 307'd to /login and iOS could never fetch a home-screen icon. The OS fetches that
    // without the session cookie in any case, so gating it can only ever fail.
    //
    // Safe to widen: nothing user-specific is served with an image extension. Every
    // route that reads stored data is a page or an /api handler, both still gated.
    "/((?!$|api/auth|_next/static|_next/image|mountains.avif|.*\\.(?:svg|png|ico|avif|jpg|jpeg|webp)).*)",
  ],
};
