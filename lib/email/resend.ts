import "server-only"

import { Resend } from "resend"

export const isResendConfigured = Boolean(process.env.RESEND_API_KEY)
export const EMAIL_FROM = process.env.RESEND_FROM_EMAIL || "FinPilot AI <onboarding@resend.dev>"

let client: Resend | null = null

export function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY belum diisi di .env")
  }

  client ??= new Resend(process.env.RESEND_API_KEY)
  return client
}

export async function sendEmail(params: { to: string; subject: string; html: string }) {
  const resend = getResend()

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
  })

  if (error) throw new Error(error.message)
}
