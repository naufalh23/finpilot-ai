import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Sparkles } from "lucide-react"

import { AuthForms } from "@/app/login/auth-forms"
import { getSessionUser } from "@/lib/auth"
import { isSupabaseConfigured } from "@/lib/supabase/env"

export const metadata: Metadata = {
  title: "Masuk",
}

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Proses masuk terputus. Silakan coba lagi.",
  exchange_failed: "Sesi gagal dibuat. Silakan coba lagi.",
  oauth_start_failed: "Tidak bisa menghubungi Google. Periksa konfigurasi Supabase.",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  if (isSupabaseConfigured) {
    const user = await getSessionUser()
    if (user) redirect("/dashboard")
  }

  const { next, error } = await searchParams

  // The OAuth redirect target must be an absolute URL, and it has to match the
  // host the user actually opened (localhost vs deployed domain).
  const headerList = await headers()
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000"
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
  const origin = `${protocol}://${host}`

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-12">
      {/* Calm ambient wash — the only decorative element on the page. */}
      <div
        aria-hidden
        className="from-primary/12 pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-b via-transparent to-transparent blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="bg-primary text-primary-foreground shadow-soft mb-6 flex size-14 items-center justify-center rounded-[18px]">
            <Sparkles className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">FinPilot AI</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-balance">
            Personal finance assistant yang mencatat, memahami, dan menjelaskan ke mana uang Anda
            pergi.
          </p>
        </div>

        {error ? (
          <div className="border-danger/30 bg-danger/10 text-danger mb-4 rounded-field border px-4 py-3 text-sm">
            {ERROR_MESSAGES[error] ?? "Gagal masuk. Silakan coba lagi."}
          </div>
        ) : null}

        {isSupabaseConfigured ? (
          <AuthForms next={next ?? "/dashboard"} origin={origin} />
        ) : (
          <div className="border-warning/30 bg-warning/10 text-warning-foreground dark:text-warning rounded-field border px-4 py-3 text-sm leading-relaxed">
            Supabase belum dikonfigurasi. Isi{" "}
            <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
            <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di file{" "}
            <code className="font-mono">.env</code>, aktifkan provider Google di Supabase
            Dashboard, lalu jalankan ulang server.
          </div>
        )}

        <p className="text-muted-foreground mt-8 text-center text-xs leading-relaxed">
          Data keuangan Anda disimpan privat dan hanya digunakan untuk analisis di dalam aplikasi
          ini.
        </p>
      </div>
    </main>
  )
}
