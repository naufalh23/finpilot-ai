"use client"

/**
 * Preference and de-dup bookkeeping for browser notifications, kept in
 * localStorage since it's inherently per-device — unlike the in-app
 * notification list, there is no server row to sync it against.
 */
const ENABLED_KEY = "finpilot:browser-notify-enabled"
const FIRED_KEY = "finpilot:browser-notify-fired"
const MAX_FIRED_HISTORY = 200

export function isBrowserNotifySupported() {
  return typeof window !== "undefined" && "Notification" in window
}

export function isBrowserNotifyEnabled() {
  if (!isBrowserNotifySupported()) return false
  return window.localStorage.getItem(ENABLED_KEY) === "1"
}

export function setBrowserNotifyEnabled(enabled: boolean) {
  window.localStorage.setItem(ENABLED_KEY, enabled ? "1" : "0")
}

function getFiredIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(FIRED_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function markFired(ids: string[]) {
  const fired = getFiredIds()
  for (const id of ids) fired.add(id)
  // Keep the history bounded so it doesn't grow forever in localStorage.
  const trimmed = [...fired].slice(-MAX_FIRED_HISTORY)
  window.localStorage.setItem(FIRED_KEY, JSON.stringify(trimmed))
}

export type NotifiableItem = { id: string; title: string; body: string; readAt: string | null }

/**
 * Fires a native browser Notification for every unread item not yet shown on
 * this device. Best-effort only: this runs while the tab is open, with no
 * service worker or push subscription behind it, so it cannot wake the app
 * once the tab or browser is closed — that would need a push server, which is
 * out of scope for a single-user personal build.
 */
export function fireUnnotified(items: NotifiableItem[]) {
  if (!isBrowserNotifySupported()) return
  if (!isBrowserNotifyEnabled()) return
  if (Notification.permission !== "granted") return

  const fired = getFiredIds()
  const unfired = items.filter((item) => !item.readAt && !fired.has(item.id))

  if (unfired.length === 0) return

  for (const item of unfired) {
    new Notification(item.title, { body: item.body, tag: item.id })
  }

  markFired(unfired.map((item) => item.id))
}
