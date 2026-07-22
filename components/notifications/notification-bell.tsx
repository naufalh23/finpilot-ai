"use client"

import * as React from "react"
import Link from "next/link"
import {
  Bell,
  CalendarClock,
  CreditCard,
  Landmark,
  PiggyBank,
  Repeat,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications"
import type { NotificationKind } from "@/lib/generated/prisma/enums"
import type { NotificationItem } from "@/lib/queries/notifications"
import { cn } from "@/lib/utils"

const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  BUDGET: PiggyBank,
  SUBSCRIPTION: Repeat,
  CREDIT_CARD: CreditCard,
  LOAN: Landmark,
  RECURRING: CalendarClock,
  INSIGHT: Sparkles,
}

export function NotificationBell({
  notifications: initialNotifications,
  unreadCount: initialUnreadCount,
  className,
}: {
  notifications: NotificationItem[]
  unreadCount: number
  className?: string
}) {
  const [notifications, setNotifications] = React.useState(initialNotifications)
  const [unreadCount, setUnreadCount] = React.useState(initialUnreadCount)
  const [pending, startTransition] = React.useTransition()

  // The bell lives in a layout that persists across client-side navigations,
  // so it won't naturally re-render with fresh server data until the shell
  // itself remounts (hard reload, or a fresh sign-in). Sync whenever the
  // server does hand us new props.
  React.useEffect(() => {
    setNotifications(initialNotifications)
    setUnreadCount(initialUnreadCount)
  }, [initialNotifications, initialUnreadCount])

  function handleItemClick(notification: NotificationItem) {
    if (notification.readAt) return

    // Optimistic: the badge should drop the instant you click, not after a
    // round trip — revalidatePath alone wouldn't reach an already-mounted tab.
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item
      )
    )
    setUnreadCount((count) => Math.max(0, count - 1))
    void markNotificationRead(notification.id)
  }

  function handleMarkAll() {
    setNotifications((current) =>
      current.map((item) => (item.readAt ? item : { ...item, readAt: new Date().toISOString() }))
    )
    setUnreadCount(0)
    startTransition(async () => {
      await markAllNotificationsRead()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className={cn("relative", className)} />}>
        <Bell className="size-[18px]" />
        {unreadCount > 0 ? (
          <span className="bg-danger text-danger-foreground absolute top-1 right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
        <span className="sr-only">Notifikasi{unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ""}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <p className="text-sm font-semibold">Notifikasi</p>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={pending}
              className="text-primary text-xs font-medium hover:underline disabled:opacity-50"
            >
              Tandai semua dibaca
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator className="mx-0" />

        {notifications.length === 0 ? (
          <p className="text-muted-foreground px-3 py-8 text-center text-sm">
            Belum ada notifikasi.
          </p>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="p-1">
              {notifications.map((notification) => {
                const Icon = KIND_ICON[notification.kind]
                const isUnread = !notification.readAt

                return (
                  <DropdownMenuItem
                    key={notification.id}
                    render={
                      <Link
                        href={notification.link ?? "#"}
                        onClick={() => handleItemClick(notification)}
                      />
                    }
                    className="items-start gap-2.5 px-2 py-2.5 whitespace-normal"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[9px]",
                        isUnread ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "min-w-0 truncate text-xs",
                            isUnread ? "font-semibold" : "font-medium"
                          )}
                        >
                          {notification.title}
                        </span>
                        {isUnread ? (
                          <span className="bg-primary size-1.5 shrink-0 rounded-full" />
                        ) : null}
                      </span>
                      <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                        {notification.body}
                      </span>
                    </span>
                  </DropdownMenuItem>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
