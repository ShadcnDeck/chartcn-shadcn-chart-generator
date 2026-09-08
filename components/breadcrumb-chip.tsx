import Link from "next/link"
import { ChevronRight } from "lucide-react"

export interface BreadcrumbChipItem {
  label: string
  href?: string
}

export function BreadcrumbChip({ items }: { items: BreadcrumbChipItem[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
    >
      {items.map((item, index) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {index > 0 && <ChevronRight className="size-3 shrink-0 text-primary/50" />}
          {item.href ? (
            <Link href={item.href} className="transition-colors hover:text-primary/70">
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
