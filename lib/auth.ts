import "server-only"

import { cache } from "react"

import { DEFAULT_CATEGORIES } from "@/lib/constants"
import { prisma } from "@/lib/db"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type AppUser = {
  id: string
  email: string
  name: string | null
  image: string | null
}

function toAppUser(user: {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
}): AppUser {
  const metadata = user.user_metadata ?? {}

  return {
    id: user.id,
    email: user.email ?? "",
    name: (metadata.full_name as string) ?? (metadata.name as string) ?? null,
    image: (metadata.avatar_url as string) ?? (metadata.picture as string) ?? null,
  }
}

/**
 * The authenticated Supabase user, or null. Uses `getUser()` rather than
 * `getSession()` because only the former revalidates the JWT against Supabase —
 * session cookies can be spoofed, `getUser` cannot.
 */
export const getSessionUser = cache(async (): Promise<AppUser | null> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) return null

  return toAppUser(data.user)
})

/**
 * Creates the application-side mirror of a Supabase user on first sight, along
 * with their settings row and the default category set. Safe to call repeatedly.
 */
export async function bootstrapUser(user: AppUser) {
  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true },
  })

  if (existing) {
    return
  }

  await prisma.$transaction([
    prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: new Date(),
      },
    }),
    prisma.userSettings.create({ data: { userId: user.id } }),
    prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((category, index) => ({
        ...category,
        userId: user.id,
        isDefault: true,
        sortOrder: index,
      })),
    }),
  ])
}

/**
 * Session guard for Server Components and Server Actions. Server Actions are
 * reachable by direct POST, so every one of them must call this.
 *
 * Deduped per request via React `cache`, so the bootstrap check costs one
 * primary-key lookup no matter how many queries run on a page.
 */
export const requireUser = cache(async (): Promise<AppUser> => {
  const user = await getSessionUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  await bootstrapUser(user)

  return user
})
