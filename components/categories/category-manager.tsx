"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Archive, ArchiveRestore, Check, Loader2, MoreHorizontal, Pencil, Plus, Tag, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/shared/empty-state"
import { ICON_NAMES, IconBadge } from "@/components/shared/icon"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  createCategory,
  deleteCategory,
  setCategoryArchived,
  updateCategory,
} from "@/lib/actions/category"
import { PICKER_COLORS } from "@/lib/constants"
import type { CategoryType } from "@/lib/generated/prisma/enums"
import type { CategorySummary } from "@/lib/queries/categories"
import { FIELD_LIMITS } from "@/lib/validators"
import { cn } from "@/lib/utils"

export function CategoryManager({ categories }: { categories: CategorySummary[] }) {
  const router = useRouter()
  const [tab, setTab] = React.useState<CategoryType>("EXPENSE")
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<CategorySummary | null>(null)
  const [, startTransition] = React.useTransition()

  const visible = categories.filter((category) => category.type === tab)
  const active = visible.filter((category) => !category.isArchived)
  const archived = visible.filter((category) => category.isArchived)

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.error ?? "Terjadi kesalahan")
        return
      }
      toast.success(success)
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="bg-muted flex gap-1 rounded-field p-1">
          {(["EXPENSE", "INCOME"] as CategoryType[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                "h-9 rounded-[9px] px-4 text-sm font-medium transition-colors",
                tab === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {value === "EXPENSE" ? "Pengeluaran" : "Pemasukan"}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          className="h-9 rounded-field"
          onClick={() => {
            setEditing(null)
            setSheetOpen(true)
          }}
        >
          <Plus className="size-4" />
          Tambah
        </Button>
      </div>

      {active.length === 0 ? (
        <div className="card-surface">
          <EmptyState
            icon={Tag}
            title="Belum ada kategori."
            description="Tambahkan kategori agar transaksi bisa dikelompokkan."
          />
        </div>
      ) : (
        <ul className="card-surface divide-border divide-y overflow-hidden">
          {active.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              onEdit={() => {
                setEditing(category)
                setSheetOpen(true)
              }}
              onArchive={() =>
                run(() => setCategoryArchived(category.id, true), "Kategori diarsipkan")
              }
              onDelete={() => run(() => deleteCategory(category.id), "Kategori dihapus")}
            />
          ))}
        </ul>
      )}

      {archived.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-muted-foreground text-sm font-semibold">Diarsipkan</h2>
          <ul className="card-surface divide-border divide-y overflow-hidden opacity-70">
            {archived.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                onEdit={() => {
                  setEditing(category)
                  setSheetOpen(true)
                }}
                onRestore={() =>
                  run(() => setCategoryArchived(category.id, false), "Kategori dipulihkan")
                }
                onDelete={() => run(() => deleteCategory(category.id), "Kategori dihapus")}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <CategoryFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        category={editing}
        defaultType={tab}
      />
    </div>
  )
}

function CategoryRow({
  category,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: {
  category: CategorySummary
  onEdit: () => void
  onArchive?: () => void
  onRestore?: () => void
  onDelete: () => void
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <IconBadge name={category.icon} color={category.color} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{category.name}</p>
        <p className="text-muted-foreground text-xs">
          {category.transactionCount} transaksi
          {category.isDefault ? " · bawaan" : ""}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Aksi kategori</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil />
            Ubah
          </DropdownMenuItem>
          {onArchive ? (
            <DropdownMenuItem onClick={onArchive}>
              <Archive />
              Arsipkan
            </DropdownMenuItem>
          ) : null}
          {onRestore ? (
            <DropdownMenuItem onClick={onRestore}>
              <ArchiveRestore />
              Pulihkan
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 />
            Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}

function CategoryFormSheet({
  open,
  onOpenChange,
  category,
  defaultType,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: CategorySummary | null
  defaultType: CategoryType
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [name, setName] = React.useState("")
  const [type, setType] = React.useState<CategoryType>(defaultType)
  const [icon, setIcon] = React.useState<string>(ICON_NAMES[0])
  const [color, setColor] = React.useState(PICKER_COLORS[0])
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return

    setName(category?.name ?? "")
    setType(category?.type ?? defaultType)
    setIcon(category?.icon ?? ICON_NAMES[0])
    setColor(category?.color ?? PICKER_COLORS[0])
    setError(null)
  }, [open, category, defaultType])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!name.trim()) {
      setError("Nama kategori wajib diisi")
      return
    }

    const payload = { name: name.trim(), type, icon, color }

    startTransition(async () => {
      const result = category
        ? await updateCategory(category.id, payload)
        : await createCategory(payload)

      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(category ? "Kategori diperbarui" : "Kategori ditambahkan")
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-modal p-0 sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:w-[calc(100%-2rem)] sm:max-w-md sm:-translate-x-1/2 sm:rounded-modal sm:border"
      >
        <SheetHeader className="px-5 pt-5 pb-0">
          <SheetTitle className="text-lg font-semibold">
            {category ? "Ubah Kategori" : "Tambah Kategori"}
          </SheetTitle>
          <SheetDescription>Kategori memisahkan pemasukan dan pengeluaran.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 pt-5 pb-6">
          <div className="bg-muted flex gap-1 rounded-field p-1">
            {(["EXPENSE", "INCOME"] as CategoryType[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                className={cn(
                  "h-9 flex-1 rounded-[9px] text-sm font-medium transition-colors",
                  type === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {value === "EXPENSE" ? "Pengeluaran" : "Pemasukan"}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="category-name" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Nama
            </Label>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={FIELD_LIMITS.categoryName}
              placeholder="mis. Kopi, Parkir, Donasi"
              className="h-11 rounded-field px-3"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Ikon
            </Label>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
              {ICON_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-label={name}
                  onClick={() => setIcon(name)}
                  className={cn(
                    "flex items-center justify-center rounded-field border p-1 transition-colors",
                    icon === name ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted"
                  )}
                >
                  <IconBadge name={name} color={color} size="sm" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Warna
            </Label>
            <div className="flex flex-wrap gap-2">
              {PICKER_COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={`Warna ${option}`}
                  onClick={() => setColor(option)}
                  style={{ backgroundColor: option }}
                  className={cn(
                    "size-9 rounded-full transition-transform",
                    color === option
                      ? "ring-foreground ring-2 ring-offset-2 ring-offset-[var(--popover)]"
                      : "hover:scale-105"
                  )}
                />
              ))}
            </div>
          </div>

          {error ? <p className="text-danger text-xs">{error}</p> : null}

          <Button type="submit" className="h-12 rounded-field text-base" disabled={pending}>
            {pending ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
            {category ? "Simpan Perubahan" : "Simpan Kategori"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
