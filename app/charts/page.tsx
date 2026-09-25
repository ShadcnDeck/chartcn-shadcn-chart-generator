import type { Metadata } from "next"

import { BreadcrumbChip } from "@/components/breadcrumb-chip"
import { ChartCard } from "@/components/chart-card"
import { JsonLd } from "@/components/json-ld"
import { chartTypes } from "@/lib/sample-data"
import { gallerySchema } from "@/lib/schema"

export const metadata: Metadata = {
  title: "Chart Gallery: 13 Shadcn UI Chart Types",
  description:
    "Browse all 13 shadcn/ui chart types: bar, horizontal bar, line, area, combo, pie, radar, scatter, radial, KPI sparkline, interactive area, waterfall, and heatmap. Preview live sample data, then paste your own CSV or JSON to generate the component.",
  alternates: {
    canonical: "/charts",
  },
}

export default function ChartsGallery() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-16 sm:py-24">
      <div className="flex flex-col gap-3">
        <BreadcrumbChip items={[{ label: "Chartcn", href: "/" }, { label: "Charts" }]} />
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Chart <span className="font-serif text-4xl italic font-normal text-primary sm:text-5xl">gallery</span>
        </h1>
        <p className="max-w-lg text-muted-foreground">
          Every chart below is powered by live sample data. Pick one to paste
          your own CSV or JSON, upload a file, or edit the table.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {chartTypes.map((type) => (
          <ChartCard key={type} type={type} />
        ))}
      </div>
      <JsonLd data={gallerySchema()} />
    </main>
  )
}
