import "server-only"

import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

import { SUPABASE_ANON_KEY, SUPABASE_URL, assertSupabaseConfigured } from "@/lib/supabase/env"

/**
 * Supabase client bound to the request's cookies. Must be created per request —
 * never hoisted to a module-level singleton, or one user's session would leak
 * into another's request.
 */
export async function createSupabaseServerClient() {
  // Read cookies first: this marks the route as dynamic, so a missing-config
  // error surfaces at request time rather than failing the production build
  // while Next tries to prerender an authenticated page.
  const cookieStore = await cookies()

  assertSupabaseConfigured()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // proxy refreshes the session instead, so this is safe to ignore.
        }
      },
    },
  })
}
