import "server-only"

import { GoogleGenAI } from "@google/genai"

/**
 * Verified available on this project's key. Older 2.x flash models are no
 * longer served to new keys, so this is not interchangeable with the numbers
 * you may find in older examples.
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash"

export const isGeminiConfigured = Boolean(process.env.GEMINI_API_KEY)

let client: GoogleGenAI | null = null

export function getGemini() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY belum diisi di .env")
  }

  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  return client
}

/**
 * Gemini returns JSON wrapped in prose or a ```json fence often enough that
 * parsing has to be defensive. Returns null rather than throwing so callers can
 * fall back to a non-AI path.
 */
export function parseJsonResponse<T>(text: string | undefined): T | null {
  if (!text) return null

  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()

  try {
    return JSON.parse(cleaned) as T
  } catch {
    // Last resort: pull the outermost {...} or [...] out of surrounding prose.
    const match = cleaned.match(/[{[][\s\S]*[}\]]/)
    if (!match) return null

    try {
      return JSON.parse(match[0]) as T
    } catch {
      return null
    }
  }
}
