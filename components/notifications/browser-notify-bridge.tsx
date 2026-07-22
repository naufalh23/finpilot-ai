"use client"

import * as React from "react"

import { fireUnnotified } from "@/lib/browser-notify"
import type { NotificationItem } from "@/lib/queries/notifications"

/**
 * Invisible bridge, mounted once in the app shell: whenever fresh
 * notifications arrive from the server, it hands the unread ones to the
 * browser Notification API (which itself decides whether to actually show
 * anything, based on the user's opt-in and OS permission).
 */
export function BrowserNotifyBridge({ notifications }: { notifications: NotificationItem[] }) {
  React.useEffect(() => {
    fireUnnotified(notifications)
  }, [notifications])

  return null
}
