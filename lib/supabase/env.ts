/**
 * Supabase Auth is the identity provider. These two values are safe to expose —
 * the anon key is a public, RLS-scoped key. The service-role key is read only in
 * server-side storage helpers and is never imported here.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

/**
 * Lets the UI show a clear "not configured yet" state instead of crashing with
 * an opaque Supabase error when the environment is incomplete.
 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env"
    )
  }
}
