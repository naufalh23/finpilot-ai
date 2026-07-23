import type { Metadata } from "next"
import Link from "next/link"
import { KeyRound } from "lucide-react"

import { ResetPasswordForm } from "@/app/reset-password/reset-password-form"
import { getSessionUser } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Atur Password Baru",
}

export default async function ResetPasswordPage() {
  const user = await getSessionUser()

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-12">
      <div
        aria-hidden
        className="from-primary/12 pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-b via-transparent to-transparent blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="bg-primary text-primary-foreground shadow-soft mb-6 flex size-14 items-center justify-center rounded-[18px]">
            <KeyRound className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Atur Password Baru</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-balance">
            {user
              ? "Masukkan password baru untuk akunmu."
              : "Link ini sudah tidak berlaku atau kedaluwarsa."}
          </p>
        </div>

        {user ? (
          <ResetPasswordForm />
        ) : (
          <Link
            href="/login"
            className="border-border hover:bg-muted flex h-12 w-full items-center justify-center rounded-field border text-sm font-medium transition-colors"
          >
            Kembali ke halaman Masuk
          </Link>
        )}
      </div>
    </main>
  )
}
