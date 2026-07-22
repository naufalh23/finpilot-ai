import { NextResponse, type NextRequest } from "next/server"

import { bootstrapUser } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase/server"

/**
 * Supabase redirects here after Google sign-in with a one-time `code`. Exchanging
 * it sets the session cookies, after which the local user record is created.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  // Only allow same-origin relative paths, so `?next=` can't be used as an
  // open redirect to another site.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard"

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`)
  }

  const metadata = data.user.user_metadata ?? {}

  await bootstrapUser({
    id: data.user.id,
    email: data.user.email ?? "",
    name: (metadata.full_name as string) ?? (metadata.name as string) ?? null,
    image: (metadata.avatar_url as string) ?? (metadata.picture as string) ?? null,
  })

  return NextResponse.redirect(`${origin}${safeNext}`)
}
