"use server"

import { redirect } from "next/navigation"

import { createSupabaseServerClient } from "@/lib/supabase/server"

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
