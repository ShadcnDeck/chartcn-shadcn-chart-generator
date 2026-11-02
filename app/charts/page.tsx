import type { Metadata } from "next"

import { BreadcrumbChip } from "@/components/breadcrumb-chip"
import { ChartCard } from "@/components/chart-card"
import { JsonLd } from "@/components/json-ld"
import { chartTypes } from "@/lib/sample-data"
import { GALLERY_TITLE, gallerySchema } from "@/lib/schema"
import { SITE_NAME } from "@/lib/seo"

const description = `Browse all ${chartTypes.length} shadcn/ui chart types: bar, horizontal bar, line, area, combo, pie, radar, scatter, radial, KPI sparkline, interactive area, waterfall, heatmap, and funnel. Preview live sample data, then paste your own CSV or JSON to generate the component.`

// openGraph/twitter replace the layout's whole objects, so the share banner
// and site name are repeated here; otherwise shares show the home page.
export const metadata: Metadata = {
  title: GALLERY_TITLE,
  description,
  alternates: {
    canonical: "/charts",
  },
  openGraph: {
    title: GALLERY_TITLE,
    description,
    url: "/charts",
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: "og-banner.jpg", width: 1200, height: 630, alt: GALLERY_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: GALLERY_TITLE,
    description,
    images: ["og-banner.jpg"],
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
