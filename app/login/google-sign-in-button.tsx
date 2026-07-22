"use client"

import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"

import { signInWithGoogle } from "@/app/login/actions"
import { Button } from "@/components/ui/button"

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.86c2.26-2.09 3.58-5.17 3.58-8.85Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.7 0 3.99 2.47 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant="outline"
      className="h-12 w-full gap-3 rounded-field text-base font-medium"
      disabled={pending}
    >
      {pending ? <Loader2 className="size-5 animate-spin" /> : <GoogleMark />}
      {pending ? "Menghubungkan…" : "Lanjutkan dengan Google"}
    </Button>
  )
}

export function GoogleSignInButton({ next, origin }: { next: string; origin: string }) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="origin" value={origin} />
      <SubmitButton />
    </form>
  )
}
