"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionError, actionOk, type ActionResult } from "@/lib/actions/types"
import { askCoach } from "@/lib/ai/coach"
import { isGeminiConfigured } from "@/lib/ai/gemini"

export type ChatReply = { sessionId: string; answer: string }

/**
 * One chat turn: persists the question, asks Gemini with the session's recent
 * history, then persists the answer.
 */
export async function sendCoachMessage(
  question: string,
  sessionId?: string | null
): Promise<ActionResult<ChatReply>> {
  const user = await requireUser()

  const trimmed = question.trim()

  if (!trimmed) return actionError("Pertanyaan tidak boleh kosong")
  if (trimmed.length > 1000) return actionError("Pertanyaan terlalu panjang (maksimal 1000 karakter)")
  if (!isGeminiConfigured) return actionError("GEMINI_API_KEY belum diisi. AI Coach tidak tersedia.")

  // Scoped by userId so a guessed session id can't be written to.
  const session = sessionId
    ? await prisma.chatSession.findFirst({ where: { id: sessionId, userId: user.id } })
    : null

  const activeSession =
    session ??
    (await prisma.chatSession.create({
      data: { userId: user.id, title: trimmed.slice(0, 60) },
    }))

  const history = await prisma.chatMessage.findMany({
    where: { sessionId: activeSession.id },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { role: true, content: true },
  })

  let answer: string
  try {
    answer = await askCoach(trimmed, history)
  } catch {
    return actionError("Gagal menghubungi AI. Coba lagi sebentar lagi.")
  }

  await prisma.$transaction([
    prisma.chatMessage.create({
      data: { sessionId: activeSession.id, role: "USER", content: trimmed },
    }),
    prisma.chatMessage.create({
      data: { sessionId: activeSession.id, role: "ASSISTANT", content: answer },
    }),
    prisma.chatSession.update({
      where: { id: activeSession.id },
      data: { updatedAt: new Date() },
    }),
  ])

  revalidatePath("/coach")
  return actionOk({ sessionId: activeSession.id, answer })
}

export async function clearCoachHistory(): Promise<ActionResult<void>> {
  const user = await requireUser()

  await prisma.chatSession.deleteMany({ where: { userId: user.id } })

  revalidatePath("/coach")
  return actionOk()
}
