"use client"

import * as React from "react"
import { ChevronRight } from "lucide-react"

import { ProfileSheet } from "@/components/settings/profile-sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function AccountHeader({
  user,
}: {
  user: { name: string | null; email: string; image: string | null }
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="card-surface hover:bg-muted/50 flex w-full items-center gap-3 p-4 text-left transition-colors"
      >
        <Avatar className="size-12">
          {user.image ? <AvatarImage src={user.image} alt="" /> : null}
          <AvatarFallback>{user.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name ?? "Akun saya"}</p>
          <p className="text-muted-foreground truncate text-sm">{user.email}</p>
        </div>
        <ChevronRight className="text-muted-foreground size-4 shrink-0" />
      </button>

      <ProfileSheet user={user} open={open} onOpenChange={setOpen} />
    </>
  )
}
