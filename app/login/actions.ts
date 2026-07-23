"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { bootstrapUser } from "@/lib/auth"
import { actionError, actionOk, type ActionResult } from "@/lib/actions/types"
import { sendEmail } from "@/lib/email/resend"
import { passwordResetEmailHtml, verificationEmailHtml } from "@/lib/email/templates"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { emailSchema, FIELD_LIMITS, passwordSchema } from "@/lib/validators"

export async function signInWithGoogle(formData: FormData) {
  const nextPath = (formData.get("next") as string) || "/dashboard"
  const origin = (formData.get("origin") as string) || ""

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      queryParams: {
        // Ask Google for a refresh token and let the user pick an account.
        access_type: "offline",
        prompt: "consent",
      },
    },
  })

  if (error || !data.url) {
    redirect(`/login?error=oauth_start_failed`)
  }

  redirect(data.url)
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()

  redirect("/login")
}

function bootstrapFromSupabaseUser(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  const metadata = user.user_metadata ?? {}
  return bootstrapUser({
    id: user.id,
    email: user.email ?? "",
    name: (metadata.full_name as string) ?? (metadata.name as string) ?? null,
    image: (metadata.avatar_url as string) ?? (metadata.picture as string) ?? null,
  })
}

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(FIELD_LIMITS.profileName),
  email: emailSchema,
  password: passwordSchema,
})

/**
 * Creates the Supabase user (unconfirmed) and hands back a confirmation link
 * via the admin API, rather than using the anon-key `signUp()` — that would
 * trigger Supabase's own mailer, and confirmation email delivery here goes
 * through Resend instead, consistently with password reset.
 */
export async function signUpWithPassword(
  input: unknown,
  origin: string
): Promise<ActionResult<{ email: string }>> {
  const parsed = signUpSchema.safeParse(input)

  if (!parsed.success) {
    return actionError("Data tidak valid", parsed.error.flatten().fieldErrors)
  }

  const { name, email, password } = parsed.data

  let actionLink: string
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        data: { full_name: name },
        redirectTo: `${origin}/auth/callback?next=/dashboard`,
      },
    })

    if (error) {
      const message = error.message?.toLowerCase() ?? ""
      if (message.includes("already") || message.includes("registered")) {
        return actionError("Email ini sudah terdaftar. Coba masuk, atau reset password kalau lupa.")
      }
      return actionError("Gagal membuat akun. Coba lagi.")
    }

    // `action_link` redirects with tokens in a URL fragment (implicit flow),
    // which a server-side callback never sees. `token_hash` verifies
    // server-side instead — the right mechanism for a link opened from an
    // email client, possibly on a different device than the one that signed up.
    actionLink = `${origin}/auth/callback?token_hash=${data.properties.hashed_token}&type=signup&next=/dashboard`
  } catch {
    return actionError("Pendaftaran belum tersedia. Coba lagi nanti.")
  }

  try {
    await sendEmail({
      to: email,
      subject: "Verifikasi email FinPilot AI kamu",
      html: verificationEmailHtml({ name, actionLink }),
    })
  } catch {
    return actionError("Akun dibuat, tapi email verifikasi gagal terkirim. Coba minta ulang lewat halaman Masuk.")
  }

  return actionOk({ email })
}

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password wajib diisi"),
})

export async function signInWithPassword(input: unknown): Promise<ActionResult<void>> {
  const parsed = signInSchema.safeParse(input)

  if (!parsed.success) {
    return actionError("Email atau password tidak valid")
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") {
      return actionError("Email belum diverifikasi. Cek kotak masuk kamu.")
    }
    return actionError("Email atau password salah")
  }

  await bootstrapFromSupabaseUser(data.user)

  redirect("/dashboard")
}

/**
 * Always responds the same way whether or not the email is registered —
 * anything else would let a caller enumerate which emails have accounts.
 */
export async function requestPasswordReset(input: unknown, origin: string): Promise<ActionResult<void>> {
  const parsed = z.object({ email: emailSchema }).safeParse(input)

  if (!parsed.success) {
    return actionError("Email tidak valid")
  }

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: parsed.data.email,
      options: { redirectTo: `${origin}/auth/callback?next=/reset-password` },
    })

    if (!error && data.user) {
      const metadata = data.user.user_metadata ?? {}
      const actionLink = `${origin}/auth/callback?token_hash=${data.properties.hashed_token}&type=recovery&next=/reset-password`
      await sendEmail({
        to: parsed.data.email,
        subject: "Reset password FinPilot AI",
        html: passwordResetEmailHtml({
          name: (metadata.full_name as string) ?? null,
          actionLink,
        }),
      })
    }
  } catch {
    // Swallowed deliberately — the response below must not depend on whether
    // this succeeded, or a timing/error difference would leak account existence.
  }

  return actionOk()
}
