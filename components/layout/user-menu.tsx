"use client"

import Link from "next/link"
import { LogOut, Settings, User } from "lucide-react"

import { signOutAction } from "@/app/login/actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type SessionUser = {
  name?: string | null
  email?: string | null
  image?: string | null
}

function initials(user: SessionUser) {
  const source = user.name ?? user.email ?? "?"
  return source
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function UserMenu({ user, showDetails = false }: { user: SessionUser; showDetails?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className={
              showDetails
                ? "h-auto w-full justify-start gap-3 rounded-field px-2 py-2"
                : "size-9 rounded-full p-0"
            }
          />
        }
      >
        <Avatar className="size-8">
          {user.image ? <AvatarImage src={user.image} alt="" /> : null}
          <AvatarFallback>{initials(user)}</AvatarFallback>
        </Avatar>
        {showDetails ? (
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-medium">{user.name ?? "Akun saya"}</span>
            <span className="text-muted-foreground block truncate text-xs">{user.email}</span>
          </span>
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{user.name ?? "Akun saya"}</p>
          <p className="text-muted-foreground truncate text-xs">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings" />}>
          <Settings />
          Pengaturan
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/settings/categories" />}>
          <User />
          Kategori
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <DropdownMenuItem
            variant="destructive"
            render={<button type="submit" className="w-full" />}
            closeOnClick={false}
          >
            <LogOut />
            Keluar
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
