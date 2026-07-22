import type { LucideIcon } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"

/** Route exists so navigation never dead-ends before the module ships. */
export function ComingSoon({
  title,
  description,
  icon: Icon,
  planned,
}: {
  title: string
  description: string
  icon: LucideIcon
  planned: string[]
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />

      <section className="card-surface p-6">
        <span className="bg-ai/12 text-ai mb-4 flex size-11 items-center justify-center rounded-[13px]">
          <Icon className="size-5" />
        </span>
        <p className="text-sm font-medium">Modul ini sedang dibangun.</p>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Yang akan tersedia di sini:
        </p>
        <ul className="text-muted-foreground mt-3 space-y-1.5 text-sm">
          {planned.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="bg-muted-foreground/40 mt-2 size-1 shrink-0 rounded-full" />
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
