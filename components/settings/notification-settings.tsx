"use client"

import * as React from "react"
import { toast } from "sonner"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { updateNotificationPreferences } from "@/lib/actions/settings"
import {
  isBrowserNotifyEnabled,
  isBrowserNotifySupported,
  setBrowserNotifyEnabled,
} from "@/lib/browser-notify"

function Row({
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  title: string
  description: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const id = React.useId()

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">
          {title}
        </Label>
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{description}</p>
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  )
}

export function NotificationSettings({
  notifyBudget: initialNotifyBudget,
  notifyBills: initialNotifyBills,
}: {
  notifyBudget: boolean
  notifyBills: boolean
}) {
  const [notifyBudget, setNotifyBudget] = React.useState(initialNotifyBudget)
  const [notifyBills, setNotifyBills] = React.useState(initialNotifyBills)
  const [browserEnabled, setBrowserEnabled] = React.useState(false)
  const [supported, setSupported] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  // Permission state and localStorage are only knowable on the client, so
  // this seeds after mount rather than from server props.
  React.useEffect(() => {
    setSupported(isBrowserNotifySupported())
    setBrowserEnabled(isBrowserNotifyEnabled())
  }, [])

  function save(next: { notifyBudget: boolean; notifyBills: boolean }) {
    startTransition(async () => {
      const result = await updateNotificationPreferences(next)
      if (!result.ok) {
        toast.error(result.error)
        // Revert the optimistic flip.
        setNotifyBudget(initialNotifyBudget)
        setNotifyBills(initialNotifyBills)
      }
    })
  }

  async function handleBrowserToggle(next: boolean) {
    if (!next) {
      setBrowserEnabled(false)
      setBrowserNotifyEnabled(false)
      return
    }

    if (Notification.permission === "denied") {
      toast.error("Izin notifikasi diblokir di browser. Aktifkan lewat pengaturan situs.")
      return
    }

    const permission =
      Notification.permission === "granted" ? "granted" : await Notification.requestPermission()

    if (permission !== "granted") {
      toast.error("Izin notifikasi tidak diberikan.")
      return
    }

    setBrowserEnabled(true)
    setBrowserNotifyEnabled(true)
    toast.success("Notifikasi browser diaktifkan")
  }

  return (
    <div className="card-surface divide-border divide-y overflow-hidden">
      <Row
        title="Peringatan Budget"
        description="Saat pengeluaran mendekati atau melewati batas budget."
        checked={notifyBudget}
        disabled={pending}
        onCheckedChange={(checked) => {
          setNotifyBudget(checked)
          save({ notifyBudget: checked, notifyBills })
        }}
      />
      <Row
        title="Pengingat Tagihan"
        description="Langganan, kartu kredit, pinjaman, dan transaksi berulang yang jatuh tempo."
        checked={notifyBills}
        disabled={pending}
        onCheckedChange={(checked) => {
          setNotifyBills(checked)
          save({ notifyBudget, notifyBills: checked })
        }}
      />
      <Row
        title="Notifikasi Browser"
        description={
          supported
            ? "Tampilkan notifikasi dari browser selagi FinPilot terbuka di tab ini."
            : "Browser ini tidak mendukung notifikasi."
        }
        checked={browserEnabled}
        disabled={!supported}
        onCheckedChange={handleBrowserToggle}
      />
    </div>
  )
}
