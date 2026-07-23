"use client"

import * as React from "react"
import { Camera, ImageUp, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { scanReceipt, type ReceiptDraft } from "@/lib/actions/ai"
import { compressImageFile } from "@/lib/upload/compress-image"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Matches the three-beat loading copy in DESIGN.md § Receipt Scanner. */
const STAGES = ["Membaca struk…", "Menganalisis…", "Mengkategorikan…"]

export function ReceiptScanner({
  onExtracted,
  className,
}: {
  /** `file` is the (possibly compressed) image actually sent — kept for the caller to attach later. */
  onExtracted: (draft: ReceiptDraft, file: File) => void
  className?: string
}) {
  const [pending, setPending] = React.useState(false)
  const [stage, setStage] = React.useState(0)
  const galleryRef = React.useRef<HTMLInputElement>(null)
  const cameraRef = React.useRef<HTMLInputElement>(null)

  // Advance the copy on a timer — the request is one call, but the three beats
  // tell the user the wait is doing something.
  React.useEffect(() => {
    if (!pending) {
      setStage(0)
      return
    }

    const timer = setInterval(() => {
      setStage((current) => Math.min(current + 1, STAGES.length - 1))
    }, 1400)

    return () => clearInterval(timer)
  }, [pending])

  async function handleFile(file: File | undefined) {
    if (!file) return

    setPending(true)

    try {
      const compressed = await compressImageFile(file)

      const formData = new FormData()
      formData.append("file", compressed)

      const result = await scanReceipt(formData)

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      onExtracted(result.data, compressed)
      toast.success(
        result.data.merchant
          ? `Struk ${result.data.merchant} terbaca`
          : "Struk terbaca — periksa datanya"
      )
    } finally {
      setPending(false)
      // Allow re-picking the same file.
      if (galleryRef.current) galleryRef.current.value = ""
      if (cameraRef.current) cameraRef.current.value = ""
    }
  }

  if (pending) {
    return (
      <div
        className={cn(
          "border-ai/30 bg-ai/8 flex items-center gap-3 rounded-field border px-4 py-3.5",
          className
        )}
      >
        <Loader2 className="text-ai size-5 shrink-0 animate-spin" />
        <div className="min-w-0">
          <p className="text-ai text-sm font-medium">{STAGES[stage]}</p>
          <p className="text-muted-foreground text-xs">Gemini sedang membaca struk Anda.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      <Button
        type="button"
        variant="outline"
        className="border-ai/30 text-ai hover:bg-ai/10 h-11 flex-1 rounded-field"
        onClick={() => cameraRef.current?.click()}
      >
        <Camera className="size-4" />
        Foto Struk
      </Button>
      <Button
        type="button"
        variant="outline"
        className="border-ai/30 text-ai hover:bg-ai/10 h-11 flex-1 rounded-field"
        onClick={() => galleryRef.current?.click()}
      >
        <ImageUp className="size-4" />
        Unggah
      </Button>
    </div>
  )
}

export function ReceiptBadge({ confidence }: { confidence: number | null }) {
  return (
    <div className="border-ai/30 bg-ai/8 flex items-start gap-2.5 rounded-field border px-3.5 py-3">
      <Sparkles className="text-ai mt-0.5 size-4 shrink-0" />
      <p className="text-muted-foreground text-xs leading-relaxed">
        Draft dibuat dari struk oleh AI
        {typeof confidence === "number" ? (
          <>
            {" "}
            (keyakinan <span className="text-ai font-semibold">{Math.round(confidence * 100)}%</span>)
          </>
        ) : null}
        . Periksa jumlah dan kategorinya sebelum menyimpan.
      </p>
    </div>
  )
}
