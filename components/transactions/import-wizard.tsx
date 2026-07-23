"use client"

import * as React from "react"
import Link from "next/link"
import { useDropzone } from "react-dropzone"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Upload,
  Wallet as WalletIcon,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { commitImport, parseImportFile } from "@/lib/actions/import"
import {
  DATE_FORMAT_OPTIONS,
  TARGET_FIELDS,
  buildPreviewRows,
  type ColumnMapping,
  type DateFormat,
  type TargetField,
} from "@/lib/import/mapping"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

type WalletOption = { id: string; name: string }
type CategoryOption = { id: string; name: string; type: "INCOME" | "EXPENSE" }
type Step = "upload" | "map" | "done"

const ACCEPT = {
  "text/csv": [".csv"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
}

export function ImportWizard({
  wallets,
  categories,
}: {
  wallets: WalletOption[]
  categories: CategoryOption[]
}) {
  const [step, setStep] = React.useState<Step>("upload")
  const [uploading, setUploading] = React.useState(false)
  const [committing, setCommitting] = React.useState(false)
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [grid, setGrid] = React.useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [mapping, setMapping] = React.useState<ColumnMapping>({})
  const [dateFormat, setDateFormat] = React.useState<DateFormat>("DMY")
  const [walletId, setWalletId] = React.useState(wallets[0]?.id ?? "")
  const [result, setResult] = React.useState<{ created: number; skipped: number } | null>(null)

  const onDrop = React.useCallback(async (accepted: File[]) => {
    const file = accepted[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await parseImportFile(formData)

      if (!response.ok) {
        toast.error(response.error)
        return
      }

      setGrid({ headers: response.data.headers, rows: response.data.rows })
      setMapping(response.data.suggestedMapping)
      setDateFormat(response.data.suggestedDateFormat)
      setFileName(file.name)
      setStep("map")
    } finally {
      setUploading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    multiple: false,
    disabled: uploading,
  })

  const previewRows = React.useMemo(() => {
    if (!grid) return []
    return buildPreviewRows({ rows: grid.rows, mapping, dateFormat, categories })
  }, [grid, mapping, dateFormat, categories])

  const includedRows = React.useMemo(() => previewRows.filter((row) => row.included), [previewRows])
  const errorCount = previewRows.length - includedRows.length
  const warningCount = includedRows.filter((row) => row.issues.length > 0).length

  function setFieldMapping(field: TargetField, value: string) {
    setMapping((prev) => ({ ...prev, [field]: value === "none" ? null : Number(value) }))
  }

  function reset() {
    setStep("upload")
    setGrid(null)
    setMapping({})
    setFileName(null)
    setResult(null)
  }

  async function handleImport() {
    if (!walletId) {
      toast.error("Pilih wallet tujuan dulu")
      return
    }

    const rows = includedRows.map((row) => ({
      date: row.date!.toISOString(),
      type: row.type!,
      amount: row.amount!,
      categoryId: row.categoryId,
      merchant: row.merchant,
      notes: row.notes,
    }))

    setCommitting(true)
    try {
      const response = await commitImport({ walletId, rows })

      if (!response.ok) {
        toast.error(response.error)
        return
      }

      setResult({ created: response.data.created, skipped: errorCount })
      setStep("done")
    } finally {
      setCommitting(false)
    }
  }

  if (wallets.length === 0) {
    return (
      <div className="card-surface">
        <EmptyState
          icon={WalletIcon}
          title="Belum ada wallet."
          description="Buat wallet terlebih dahulu sebelum mengimpor transaksi."
          action={
            <Button className="h-10 rounded-field" render={<Link href="/wallet" />}>
              Buat Wallet
            </Button>
          }
        />
      </div>
    )
  }

  if (step === "done" && result) {
    return (
      <div className="card-surface flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="bg-success/12 text-success flex size-12 items-center justify-center rounded-full">
          <CheckCircle2 className="size-6" />
        </span>
        <div>
          <p className="text-base font-semibold">{result.created} transaksi berhasil diimpor</p>
          {result.skipped > 0 ? (
            <p className="text-muted-foreground mt-1.5 max-w-xs text-sm leading-relaxed text-balance">
              {result.skipped} baris dilewati karena datanya tidak valid.
            </p>
          ) : null}
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="h-11 rounded-field" onClick={reset}>
            Impor File Lain
          </Button>
          <Button className="h-11 rounded-field" render={<Link href="/transactions" />}>
            Lihat Transaksi
          </Button>
        </div>
      </div>
    )
  }

  if (step === "map" && grid) {
    return (
      <div className="space-y-6">
        <div className="card-surface space-y-4 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">{fileName}</h2>
              <p className="text-muted-foreground text-xs">{grid.rows.length} baris terbaca</p>
            </div>
            <Button variant="ghost" size="sm" className="h-8 shrink-0 rounded-field" onClick={reset}>
              <ArrowLeft className="size-3.5" />
              Ganti file
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-medium">Wallet tujuan</label>
              <Select value={walletId} onValueChange={(value) => setWalletId(value ?? "")}>
                <SelectTrigger className="h-10 w-full rounded-field">
                  <SelectValue placeholder="Pilih wallet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((wallet) => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      {wallet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-medium">Format tanggal di file</label>
              <Select
                value={dateFormat}
                onValueChange={(value) => value && setDateFormat(value as DateFormat)}
              >
                <SelectTrigger className="h-10 w-full rounded-field">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMAT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium">
              Pemetaan kolom — cocokkan kolom di file dengan data FinPilot
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {TARGET_FIELDS.map((field) => (
                <div
                  key={field.key}
                  className="border-border flex items-center justify-between gap-2 rounded-field border px-3 py-2"
                >
                  <span className="text-sm">
                    {field.label}
                    {field.required ? <span className="text-danger">*</span> : null}
                  </span>
                  <Select
                    value={mapping[field.key] == null ? "none" : String(mapping[field.key])}
                    onValueChange={(value) => setFieldMapping(field.key, value ?? "none")}
                  >
                    <SelectTrigger size="sm" className="rounded-field">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">(tidak dipakai)</SelectItem>
                      {grid.headers.map((header, index) => (
                        <SelectItem key={index} value={String(index)}>
                          {header || `Kolom ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card-surface space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="text-success font-medium">{includedRows.length} siap diimpor</span>
            {errorCount > 0 ? <span className="text-danger font-medium">{errorCount} dilewati</span> : null}
            {warningCount > 0 ? (
              <span className="text-warning font-medium">{warningCount} peringatan</span>
            ) : null}
          </div>

          <div className="border-border max-h-96 overflow-y-auto rounded-field border">
            <Table>
              <TableHeader className="bg-card sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Merchant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.slice(0, 100).map((row) => {
                  const reasons = row.issues.map((issue) => issue.message).join("; ")

                  return (
                    <TableRow key={row.rowNumber} className={!row.included ? "bg-danger/5" : undefined}>
                      <TableCell title={reasons || undefined}>
                        {!row.included ? (
                          <XCircle className="text-danger size-4" />
                        ) : row.issues.length > 0 ? (
                          <AlertTriangle className="text-warning size-4" />
                        ) : (
                          <CheckCircle2 className="text-success size-4" />
                        )}
                      </TableCell>
                      <TableCell className={cn("text-xs", !row.date && "text-danger")}>
                        {row.date ? formatDate(row.date) : row.dateLabel || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.type === "INCOME" ? "Pemasukan" : row.type === "EXPENSE" ? "Pengeluaran" : "—"}
                      </TableCell>
                      <TableCell className="tabular text-right text-xs">
                        {row.amount !== null ? formatCurrency(row.amount) : "—"}
                      </TableCell>
                      <TableCell className="max-w-32 truncate text-xs">
                        {row.categoryName ?? (row.categoryId ? "" : "Tanpa kategori")}
                      </TableCell>
                      <TableCell className="max-w-32 truncate text-xs">{row.merchant ?? "—"}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          {previewRows.length > 100 ? (
            <p className="text-muted-foreground text-xs">
              Menampilkan 100 dari {previewRows.length} baris — ringkasan di atas tetap menghitung semuanya.
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" className="h-11 rounded-field" onClick={reset}>
            Batal
          </Button>
          <Button
            className="h-11 rounded-field"
            disabled={includedRows.length === 0 || committing || !walletId}
            onClick={handleImport}
          >
            {committing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Impor {includedRows.length} Transaksi
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card-surface p-5">
        <h2 className="text-sm font-semibold">1. Siapkan file (opsional)</h2>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Unduh template supaya kolom langsung cocok. Atau lewati saja dan unggah file apa pun —
          kolomnya bisa dipetakan manual di langkah berikutnya.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-field"
            render={<a href="/api/import/template?format=csv" download />}
          >
            <FileText className="size-4" />
            Template CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-field"
            render={<a href="/api/import/template?format=xlsx" download />}
          >
            <FileSpreadsheet className="size-4" />
            Template Excel
          </Button>
        </div>
      </div>

      <div className="card-surface p-5">
        <h2 className="mb-4 text-sm font-semibold">2. Unggah file</h2>
        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-field border-2 border-dashed px-6 py-12 text-center transition-colors",
            isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
            uploading && "pointer-events-none opacity-70"
          )}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <>
              <Loader2 className="text-primary size-6 animate-spin" />
              <p className="text-sm font-medium">Membaca file…</p>
            </>
          ) : (
            <>
              <Upload className="text-muted-foreground size-6" />
              <p className="text-sm font-medium">
                {isDragActive ? "Lepas file di sini" : "Seret file ke sini, atau klik untuk memilih"}
              </p>
              <p className="text-muted-foreground text-xs">CSV atau Excel (.xlsx), maksimal 5 MB</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
