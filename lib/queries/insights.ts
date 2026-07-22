import "server-only"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { addDays, formatCurrency, startOfDay, toNumber } from "@/lib/format"
import { getBudgetOverview } from "@/lib/queries/budgets"
import { GEMINI_MODEL, getGemini, isGeminiConfigured, parseJsonResponse } from "@/lib/ai/gemini"

export type DashboardInsight = {
  /** Present once the insight has been persisted, enabling permanent dismissal. */
  id?: string
  kind: string
  title: string
  body: string
  severity: "INFO" | "SUCCESS" | "WARNING" | "DANGER"
}

/**
 * Rule-based insights computed straight from the user's own numbers. The
 * Gemini-written version replaces the copy later; the arithmetic stays here so
 * the card always has something honest to say, even offline.
 */
async function findBudgetWarning(now: Date): Promise<DashboardInsight | null> {
  const overview = await getBudgetOverview(now)
  if (overview.budgets.length === 0) return null

  const worst = [...overview.budgets].sort((a, b) => b.ratio - a.ratio)[0]

  if (worst.status === "over") {
    return {
      kind: "budget_warning",
      title: `Budget ${worst.categoryName} sudah terlewati`,
      body: `Terpakai ${formatCurrency(worst.spent)} dari batas ${formatCurrency(
        worst.amount
      )} — lebih ${formatCurrency(Math.abs(worst.remaining))}. Tahan pengeluaran kategori ini sampai akhir bulan.`,
      severity: "DANGER",
    }
  }

  if (worst.status === "warning") {
    // Days left including today, so "sisa 1 hari" never reads as zero.
    const daysLeft = Math.max(
      1,
      new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1
    )
    const perDay = Math.floor(worst.remaining / daysLeft / 1000) * 1000

    return {
      kind: "budget_warning",
      title: `Budget ${worst.categoryName} tinggal ${Math.round((1 - worst.ratio) * 100)}%`,
      body: `Sisa ${formatCurrency(worst.remaining)} untuk ${daysLeft} hari ke depan.${
        perDay > 0 ? ` Sekitar ${formatCurrency(perDay)} per hari agar tetap aman.` : ""
      }`,
      severity: "WARNING",
    }
  }

  return null
}

async function computeInsight(): Promise<DashboardInsight | null> {
  const user = await requireUser()

  const now = new Date()

  // A blown or nearly-blown budget outranks any spending trend — it is the one
  // thing the user can still act on this month.
  const budgetWarning = await findBudgetWarning(now)
  if (budgetWarning) return budgetWarning

  const weekStart = startOfDay(addDays(now, -7))
  const previousWeekStart = startOfDay(addDays(now, -14))

  const [thisWeek, lastWeek] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId: user.id, type: "EXPENSE", date: { gte: weekStart } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId: user.id,
        type: "EXPENSE",
        date: { gte: previousWeekStart, lt: weekStart },
      },
      _sum: { amount: true },
    }),
  ])

  if (thisWeek.length === 0) {
    const total = await prisma.transaction.count({ where: { userId: user.id } })

    if (total === 0) {
      return {
        kind: "onboarding",
        title: "Mulai dari satu transaksi",
        body: "Catat pengeluaran hari ini, dan FinPilot akan mulai mengenali pola belanja Anda dalam beberapa hari.",
        severity: "INFO",
      }
    }

    return {
      kind: "quiet_week",
      title: "Minggu yang tenang",
      body: "Tidak ada pengeluaran tercatat dalam 7 hari terakhir. Pastikan tidak ada transaksi yang terlewat dicatat.",
      severity: "INFO",
    }
  }

  const previousByCategory = new Map(
    lastWeek.map((row) => [row.categoryId ?? "none", toNumber(row._sum.amount)])
  )

  const categoryIds = thisWeek
    .map((row) => row.categoryId)
    .filter((id): id is string => Boolean(id))
  const categories = categoryIds.length
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      })
    : []
  const nameById = new Map(categories.map((category) => [category.id, category.name]))

  // Biggest week-over-week jump, measured in absolute rupiah so a tiny category
  // doubling doesn't outrank a real increase.
  let biggest: { name: string; current: number; previous: number; delta: number } | null = null

  for (const row of thisWeek) {
    const current = toNumber(row._sum.amount)
    const previous = previousByCategory.get(row.categoryId ?? "none") ?? 0
    const delta = current - previous

    if (previous > 0 && delta > 0 && (!biggest || delta > biggest.delta)) {
      biggest = {
        name: row.categoryId ? (nameById.get(row.categoryId) ?? "Lainnya") : "Tanpa kategori",
        current,
        previous,
        delta,
      }
    }
  }

  if (biggest) {
    const percent = Math.round((biggest.delta / biggest.previous) * 100)
    const dailyCap = Math.round(biggest.previous / 7 / 1000) * 1000

    return {
      kind: "spending_spike",
      title: `Pengeluaran ${biggest.name} naik ${percent}%`,
      body: `Minggu ini ${formatCurrency(biggest.current)}, dibanding ${formatCurrency(
        biggest.previous
      )} minggu lalu.${
        dailyCap > 0 ? ` Untuk kembali ke pola sebelumnya, batasi sekitar ${formatCurrency(dailyCap)} per hari.` : ""
      }`,
      severity: percent >= 50 ? "WARNING" : "INFO",
    }
  }

  const currentTotal = thisWeek.reduce((sum, row) => sum + toNumber(row._sum.amount), 0)
  const previousTotal = lastWeek.reduce((sum, row) => sum + toNumber(row._sum.amount), 0)

  if (previousTotal > 0 && currentTotal < previousTotal) {
    const percent = Math.round(((previousTotal - currentTotal) / previousTotal) * 100)

    return {
      kind: "spending_drop",
      title: `Pengeluaran turun ${percent}% minggu ini`,
      body: `Total ${formatCurrency(currentTotal)}, lebih hemat ${formatCurrency(
        previousTotal - currentTotal
      )} dibanding minggu lalu. Pertahankan.`,
      severity: "SUCCESS",
    }
  }

  return {
    kind: "weekly_total",
    title: "Ringkasan minggu ini",
    body: `Anda menghabiskan ${formatCurrency(currentTotal)} dalam 7 hari terakhir, tersebar di ${
      thisWeek.length
    } kategori.`,
    severity: "INFO",
  }
}

// ---------------------------------------------------------------------------
// Gemini phrasing layer
// ---------------------------------------------------------------------------

/** Gemini is asked to rewrite at most this often, per user. */
const INSIGHT_CACHE_HOURS = 3

/** Every digit run, normalised so "Rp1.200.000" and "1200000" compare equal. */
function extractNumbers(text: string) {
  const matches = text.match(/\d[\d.,]*/g) ?? []

  return new Set(
    matches
      .map((match) => match.replace(/[^\d]/g, ""))
      .filter(Boolean)
      // Strip a trailing zero-run artefact from sentence-final periods.
      .map((digits) => digits.replace(/^0+(?=\d)/, ""))
  )
}

/**
 * The prompt asks Gemini to keep every figure intact, but a prompt is not a
 * guarantee. A rewrite that drops or invents a number is rejected outright —
 * plain wording is always better than a wrong amount.
 */
function preservesNumbers(original: string, rewritten: string) {
  const before = extractNumbers(original)
  const after = extractNumbers(rewritten)

  for (const value of before) {
    if (!after.has(value)) return false
  }
  for (const value of after) {
    if (!before.has(value)) return false
  }

  return true
}

/**
 * The arithmetic above is the source of truth; Gemini only rewrites the copy so
 * it reads like a person wrote it. If the model is unavailable or returns
 * something unusable, the computed wording is shown unchanged — the card is
 * never empty and never invents a number.
 */
async function phraseWithGemini(insight: DashboardInsight): Promise<DashboardInsight> {
  if (!isGeminiConfigured) return insight

  try {
    const ai = getGemini()

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Tulis ulang insight keuangan ini agar terasa personal dan tenang.

Judul saat ini: ${insight.title}
Isi saat ini: ${insight.body}

Aturan ketat:
- Pertahankan SEMUA angka persis seperti aslinya. Jangan mengubah, membulatkan, atau menambah angka.
- Bahasa Indonesia, sapa dengan "Anda".
- Judul maksimal 8 kata. Isi maksimal 2 kalimat.
- Nada membantu, bukan menghakimi. Tanpa emoji.
- Jawab hanya JSON: {"title": "...", "body": "..."}`,
      config: {
        responseMimeType: "application/json",
        temperature: 0.6,
        maxOutputTokens: 2000,
      },
    })

    const parsed = parseJsonResponse<{ title?: string; body?: string }>(response.text)

    if (!parsed?.title?.trim() || !parsed.body?.trim()) return insight

    const title = parsed.title.trim()
    const body = parsed.body.trim()

    if (!preservesNumbers(`${insight.title} ${insight.body}`, `${title} ${body}`)) {
      return insight
    }

    return { ...insight, title, body }
  } catch {
    return insight
  }
}

/**
 * The dashboard's AI Insight card. Reuses a recently generated insight so a
 * page load doesn't cost a Gemini call, and respects a previous dismissal.
 */
export async function getDashboardInsight(): Promise<DashboardInsight | null> {
  const user = await requireUser()

  const computed = await computeInsight()
  if (!computed) return null

  const freshSince = new Date(Date.now() - INSIGHT_CACHE_HOURS * 60 * 60 * 1000)

  const cached = await prisma.aiInsight.findFirst({
    where: { userId: user.id, kind: computed.kind, createdAt: { gte: freshSince } },
    orderBy: { createdAt: "desc" },
  })

  if (cached) {
    // Dismissed insights stay dismissed until the cache window expires.
    if (cached.dismissedAt) return null

    return {
      id: cached.id,
      kind: cached.kind,
      title: cached.title,
      body: cached.body,
      severity: cached.severity,
    }
  }

  const phrased = await phraseWithGemini(computed)

  const stored = await prisma.aiInsight.create({
    data: {
      userId: user.id,
      kind: phrased.kind,
      title: phrased.title,
      body: phrased.body,
      severity: phrased.severity,
      meta: { computedTitle: computed.title, computedBody: computed.body },
    },
  })

  return { ...phrased, id: stored.id }
}
