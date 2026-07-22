import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/env"

// Next.js 16 renamed Middleware to Proxy; the contract is unchanged.

const PUBLIC_PATHS = ["/login", "/auth"]

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Without credentials there is no session to check; let the login page render
  // its own "not configured" message rather than redirect-looping.
  if (!isSupabaseConfigured) {
    return isPublic(pathname)
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/login", request.nextUrl))
  }

  // This response object carries any refreshed auth cookies back to the browser,
  // so it must be the one we ultimately return.
  let response = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // Refreshes the session token as a side effect — do not remove.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !isPublic(pathname)) {
    const loginUrl = new URL("/login", request.nextUrl)
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname + request.nextUrl.search)
    }
    return NextResponse.redirect(loginUrl)
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl))
  }

  return response
}

export const config = {
  // Skip Next internals, static assets, and the PWA manifest/icons — the
  // installer fetches those without a session and must not be redirected.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|apple-icon|icons/|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
}
