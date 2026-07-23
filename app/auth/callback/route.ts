import { NextResponse, type NextRequest } from "next/server"

import { bootstrapUser, type AppUser } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type SupabaseAuthUser = { id: string; email?: string; user_metadata?: Record<string, unknown> }

function toBootstrapInput(user: SupabaseAuthUser): AppUser {
  const metadata = user.user_metadata ?? {}
  return {
    id: user.id,
    email: user.email ?? "",
    name: (metadata.full_name as string) ?? (metadata.name as string) ?? null,
    image: (metadata.avatar_url as string) ?? (metadata.picture as string) ?? null,
  }
}

/**
 * One callback route handles two different Supabase Auth mechanics:
 *
 * - `?code=...` — PKCE, used by the Google OAuth flow. The browser-initiated
 *   `signInWithOAuth()` call pre-stores a code verifier before redirecting to
 *   Google, so the code can be exchanged for a session here.
 * - `?token_hash=...&type=...` — email-link verification (signup
 *   confirmation, password recovery). These links can be opened on a
 *   different device/browser than the one that requested them, so there is
 *   no pre-stored PKCE verifier to exchange against — Supabase verifies the
 *   token directly instead. `signUpWithPassword`/`requestPasswordReset`
 *   build links pointing here with `token_hash` themselves, rather than
 *   emailing the raw `action_link` from `generateLink()` (which redirects
 *   with tokens in a URL fragment a server never sees).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const next = searchParams.get("next") ?? "/dashboard"

  // Only allow same-origin relative paths, so `?next=` can't be used as an
  // open redirect to another site.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard"

  const supabase = await createSupabaseServerClient()

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error || !data.user) {
      return NextResponse.redirect(`${origin}/login?error=exchange_failed`)
    }
    await bootstrapUser(toBootstrapInput(data.user))
    return NextResponse.redirect(`${origin}${safeNext}`)
  }

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "recovery" | "email" | "invite" | "magiclink" | "email_change",
    })
    if (error || !data.user) {
      return NextResponse.redirect(`${origin}/login?error=exchange_failed`)
    }
    await bootstrapUser(toBootstrapInput(data.user))
    return NextResponse.redirect(`${origin}${safeNext}`)
  }

  return NextResponse.redirect(`${origin}/login?error=missing_code`)
}
