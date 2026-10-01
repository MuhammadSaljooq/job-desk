import { NextResponse, type NextRequest } from "next/server"

// Optimistic gate: send visitors without a session cookie to /login. The real check (a
// valid token for a user that still exists) is requireUser() in every page and action.

const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"]
const PUBLIC_PATHS = ["/login"]

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name))

  // /login decides for itself (it checks the session is still valid), so a stale cookie
  // can never cause a redirect loop.
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next()
  if (!hasSession) {
    const url = new URL("/login", request.url)
    if (pathname !== "/") url.searchParams.set("next", pathname + search)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  // Everything except Auth.js endpoints, Next internals, the dev component gallery and files.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|dev/|favicon.ico|manifest.webmanifest|icons/|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt)$).*)",
  ],
}
