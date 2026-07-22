import type { Metadata } from "next"

import { CoachChat, type CoachMessage } from "@/components/coach/coach-chat"
import { PageHeader } from "@/components/shared/page-header"
import { requireUser } from "@/lib/auth"
import { isGeminiConfigured } from "@/lib/ai/gemini"
import { prisma } from "@/lib/db"

export const metadata: Metadata = {
  title: "AI Coach",
}

export default async function CoachPage() {
  const user = await requireUser()

  // Latest session only — the chat is a running conversation, not a folder.
  const session = await prisma.chatSession.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 50 },
    },
  })

  const messages: CoachMessage[] =
    session?.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
    })) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Coach"
        description="Tanya apa saja tentang keuangan Anda — dijawab dari data Anda sendiri."
      />

      {!isGeminiConfigured ? (
        <div className="border-warning/30 bg-warning/10 text-warning-foreground dark:text-warning rounded-field border px-4 py-3 text-sm leading-relaxed">
          <code className="font-mono">GEMINI_API_KEY</code> belum diisi di{" "}
          <code className="font-mono">.env</code>. AI Coach tidak aktif sampai key tersedia.
        </div>
      ) : null}

      <CoachChat
        initialMessages={messages}
        initialSessionId={session?.id ?? null}
        disabled={!isGeminiConfigured}
      />
    </div>
  )
}
