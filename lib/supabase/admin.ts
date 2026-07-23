import "server-only"

import { createClient } from "@supabase/supabase-js"

import { SUPABASE_URL } from "@/lib/supabase/env"

/**
 * Service-role client — bypasses RLS entirely. Every caller must already
 * have authorised the request itself (via `requireUser()` or an equivalent
 * check) before reaching for this; it is never a substitute for that check.
 */
export function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !serviceKey) {
    throw new Error("Supabase service role belum dikonfigurasi.")
  }

  return createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
