"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowUp, Bot, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { clearCoachHistory, sendCoachMessage } from "@/lib/actions/chat"
import { cn } from "@/lib/utils"

export type CoachMessage = { id: string; role: "USER" | "ASSISTANT"; content: string }

/** Straight from the PRD's example questions. */
const SUGGESTIONS = [
  "Kenapa uang saya habis?",
  "Apa kategori terbesar bulan ini?",
  "Berapa pengeluaran saya tahun ini?",
  "Apa saya aman membeli laptop Rp15 juta?",
]

export function CoachChat({
  initialMessages,
  initialSessionId,
  disabled,
}: {
  initialMessages: CoachMessage[]
  initialSessionId: string | null
  disabled: boolean
}) {
  const router = useRouter()
  const [messages, setMessages] = React.useState<CoachMessage[]>(initialMessages)
  const [sessionId, setSessionId] = React.useState<string | null>(initialSessionId)
  const [input, setInput] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const bottomRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, pending])

  async function send(question: string) {
    const trimmed = question.trim()
    if (!trimmed || pending || disabled) return

    setInput("")
    // Optimistic echo so the question appears the moment it is sent.
    setMessages((current) => [
      ...current,
      { id: `local-${Date.now()}`, role: "USER", content: trimmed },
    ])
    setPending(true)

    try {
      const result = await sendCoachMessage(trimmed, sessionId)

      if (!result.ok) {
        toast.error(result.error)
        // Drop the optimistic message; the question was never recorded.
        setMessages((current) => current.slice(0, -1))
        setInput(trimmed)
        return
      }

      setSessionId(result.data.sessionId)
      setMessages((current) => [
        ...current,
        { id: `reply-${Date.now()}`, role: "ASSISTANT", content: result.data.answer },
      ])
    } finally {
      setPending(false)
    }
  }

  async function handleClear() {
    const result = await clearCoachHistory()
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setMessages([])
    setSessionId(null)
    toast.success("Riwayat dihapus")
    router.refresh()
  }

  return (
    <div className="flex min-h-[60dvh] flex-col gap-4">
      {messages.length > 0 ? (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="rounded-field" onClick={handleClear}>
            <Trash2 className="size-3.5" />
            Hapus riwayat
          </Button>
        </div>
      ) : null}

      <div className="flex-1 space-y-4">
        {messages.length === 0 ? (
          <div className="card-surface p-6">
            <span className="bg-ai/12 text-ai mb-4 flex size-11 items-center justify-center rounded-[13px]">
              <Bot className="size-5" />
            </span>
            <p className="text-sm font-medium">Tanya apa saja tentang keuangan Anda.</p>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Saya hanya membaca data transaksi Anda sendiri — tidak ada data dari luar.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={disabled}
                  onClick={() => send(suggestion)}
                  className="border-border text-muted-foreground hover:bg-muted hover:text-foreground rounded-field border px-3 py-2 text-left text-xs transition-colors disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => <Bubble key={message.id} message={message} />)
        )}

        {pending ? (
          <div className="flex items-center gap-2.5">
            <span className="bg-ai/12 text-ai flex size-8 shrink-0 items-center justify-center rounded-[10px]">
              <Bot className="size-4" />
            </span>
            <span className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-3.5 animate-spin" />
              Menganalisis data Anda…
            </span>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void send(input)
        }}
        className="bg-background sticky bottom-20 flex items-end gap-2 lg:bottom-4"
      >
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends; Shift+Enter makes a new line.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              void send(input)
            }
          }}
          disabled={disabled || pending}
          rows={1}
          placeholder={disabled ? "AI Coach belum aktif" : "Tanya tentang keuangan Anda…"}
          className="max-h-32 min-h-12 flex-1 resize-none rounded-field px-3.5 py-3"
        />
        <Button
          type="submit"
          size="icon"
          className="size-12 shrink-0 rounded-field"
          disabled={disabled || pending || !input.trim()}
          aria-label="Kirim"
        >
          {pending ? <Loader2 className="size-5 animate-spin" /> : <ArrowUp className="size-5" />}
        </Button>
      </form>
    </div>
  )
}

function Bubble({ message }: { message: CoachMessage }) {
  const isUser = message.role === "USER"

  if (isUser) {
    return (
      <div className="flex justify-end">
        <p className="bg-primary text-primary-foreground max-w-[85%] rounded-card rounded-br-md px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap">
          {message.content}
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-2.5">
      <span className="bg-ai/12 text-ai flex size-8 shrink-0 items-center justify-center rounded-[10px]">
        <Bot className="size-4" />
      </span>
      <div
        className={cn(
          "card-surface max-w-[85%] min-w-0 rounded-tl-md px-4 py-3 text-sm leading-relaxed break-words whitespace-pre-wrap"
        )}
      >
        {message.content}
      </div>
    </div>
  )
}
