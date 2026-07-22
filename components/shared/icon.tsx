import {
  Banknote,
  Bus,
  Car,
  Clapperboard,
  CreditCard,
  Dumbbell,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  PawPrint,
  Plane,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  Wifi,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Explicit registry instead of a dynamic lucide import — keeps the icon names
 * stored in the database stable and the client bundle small.
 */
export const ICON_REGISTRY = {
  Banknote,
  Bus,
  Car,
  Clapperboard,
  CreditCard,
  Dumbbell,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  PawPrint,
  Plane,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  Wifi,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof ICON_REGISTRY

export const ICON_NAMES = Object.keys(ICON_REGISTRY) as IconName[]

export function resolveIcon(name: string | null | undefined): LucideIcon {
  if (name && name in ICON_REGISTRY) {
    return ICON_REGISTRY[name as IconName]
  }
  return Wallet
}

/** Rounded tinted square used for categories and wallets across the app. */
export function IconBadge({
  name,
  color,
  className,
  size = "md",
}: {
  name: string | null | undefined
  color?: string | null
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const Icon = resolveIcon(name)
  const accent = color ?? "var(--muted-foreground)"

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[12px]",
        size === "sm" && "size-8",
        size === "md" && "size-10",
        size === "lg" && "size-12",
        className
      )}
      style={{ backgroundColor: `color-mix(in oklab, ${accent} 16%, transparent)`, color: accent }}
    >
      <Icon className={cn(size === "sm" ? "size-4" : size === "lg" ? "size-6" : "size-5")} />
    </span>
  )
}
