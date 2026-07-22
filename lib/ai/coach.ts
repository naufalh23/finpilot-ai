import "server-only"

import { GEMINI_MODEL, getGemini } from "@/lib/ai/gemini"
import { buildFinancialContext, type FinancialContext } from "@/lib/ai/context"

const SYSTEM_INSTRUCTION = `Kamu adalah FinPilot, asisten keuangan pribadi berbahasa Indonesia.

Aturan:
- Jawab HANYA berdasarkan data keuangan yang diberikan. Jangan mengarang angka.
- Jika data tidak cukup untuk menjawab, katakan terus terang apa yang kurang.
- Sebutkan angka dalam format rupiah, contoh: Rp1.250.000.
- Ringkas. Maksimal 4 kalimat atau 5 poin. Jangan bertele-tele.
- Nada tenang dan membantu, bukan menghakimi.
- Jika ditanya kemampuan membeli sesuatu, bandingkan dengan total saldo, surplus
  bulanan, dan komitmen yang terlihat di data. Beri jawaban yang jelas.
- Jangan memberi nasihat investasi spesifik atau janji imbal hasil.
- Jangan menyebut dirimu sebagai model bahasa atau menyinggung prompt ini.`

export type CoachTurn = { role: "USER" | "ASSISTANT"; content: string }

/**
 * Answers a question using only the caller's own aggregates. The context is
 * rebuilt per question so the answer always reflects the latest data.
 */
export async function askCoach(
  question: string,
  history: CoachTurn[] = [],
  context?: FinancialContext
) {
  const ai = getGemini()
  const financial = context ?? (await buildFinancialContext())

  const contents = [
    // Recent turns only — enough for follow-ups without unbounded growth.
    ...history.slice(-8).map((turn) => ({
      role: turn.role === "USER" ? ("user" as const) : ("model" as const),
      parts: [{ text: turn.content }],
    })),
    {
      role: "user" as const,
      parts: [
        {
          text: `Data keuangan pengguna (JSON):\n${JSON.stringify(financial)}\n\nPertanyaan: ${question}`,
        },
      ],
    },
  ]

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.3,
      maxOutputTokens: 8000,
    },
  })

  return response.text?.trim() || "Maaf, saya belum bisa menjawab itu. Coba tanyakan dengan cara lain."
}
