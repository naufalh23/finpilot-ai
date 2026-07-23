"use client"

import * as React from "react"
import { ExternalLink, Loader2, Receipt } from "lucide-react"
import { toast } from "sonner"

import { getReceiptUrl } from "@/lib/actions/attachment"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

export function ReceiptViewerDialog({
  transactionId,
  open,
  onOpenChange,
}: {
  transactionId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [state, setState] = React.useState<
    { status: "loading" } | { status: "error"; message: string } | { status: "ready"; url: string; mimeType: string | null }
  >({ status: "loading" })

  React.useEffect(() => {
    if (!open || !transactionId) return

    setState({ status: "loading" })

    getReceiptUrl(transactionId).then((result) => {
      if (!result.ok) {
        setState({ status: "error", message: result.error })
        toast.error(result.error)
        return
      }
      setState({ status: "ready", url: result.data.url, mimeType: result.data.mimeType })
    })
  }, [open, transactionId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="flex items-center gap-2">
          <Receipt className="size-4" />
          Struk
        </DialogTitle>

        <div className="flex min-h-40 items-center justify-center">
          {state.status === "loading" ? (
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
          ) : state.status === "error" ? (
            <p className="text-muted-foreground text-sm">{state.message}</p>
          ) : state.mimeType === "application/pdf" ? (
            <a
              href={state.url}
              target="_blank"
              rel="noreferrer"
              className="text-primary flex items-center gap-1.5 text-sm font-medium hover:underline"
            >
              <ExternalLink className="size-4" />
              Buka PDF struk
            </a>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL is short-lived, not worth Next/Image's remote-pattern config for one dialog.
            <img
              src={state.url}
              alt="Struk transaksi"
              className="max-h-[70vh] w-full rounded-field object-contain"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
