import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight } from "lucide-react"

import { BreadcrumbChip } from "@/components/breadcrumb-chip"
import { ChartDetail, ChartDetailClient } from "@/components/chart-detail-client"
import { CopyButton } from "@/components/copy-button"
import { FaqList } from "@/components/faq-list"
import { JsonLd } from "@/components/json-ld"
import { COMMON_DATA_NOTE, chartSeo } from "@/lib/chart-seo"
import {
  chartTypeDescriptions,
  chartTypeLabels,
  chartTypes,
  sampleCSV,
  sampleJSON,
} from "@/lib/sample-data"
import { chartPageSchema } from "@/lib/schema"
import { BASE_PATH, SITE_URL } from "@/lib/seo"
import { encodeShareConfig } from "@/lib/share"
import type { ChartType } from "@/types/chart"

interface ChartDetailPageProps {
  params: Promise<{ type: string }>
}

export function generateStaticParams() {
  return chartTypes.map((type) => ({ type }))
}

function isChartType(value: string): value is ChartType {
  return (chartTypes as string[]).includes(value)
}

export async function generateMetadata({
  params,
}: ChartDetailPageProps): Promise<Metadata> {
  const { type } = await params

  if (!isChartType(type)) {
    return {}
  }

  const seo = chartSeo[type]

  // og:image / twitter:image come from ./opengraph-image.tsx (a render of
  // this chart), so they're deliberately not set here.
  return {
    title: seo.title,
    description: seo.description,
    keywords: [seo.keyword, "shadcn/ui", "recharts", "react chart", chartTypeLabels[type].toLowerCase()],
    alternates: {
      canonical: `/charts/${type}`,
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `/charts/${type}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  }
}

const PREVIEW_ROWS = 6

/** The sample CSV, trimmed for display (the interactive sample has 90 rows). */
function sampleCsvPreview(type: ChartType): { text: string; hidden: number } {
  const lines = sampleCSV[type].split("\n")
  const rows = lines.length - 1
  return {
    text: lines.slice(0, PREVIEW_ROWS + 1).join("\n"),
    hidden: Math.max(0, rows - PREVIEW_ROWS),
  }
}

function sampleJsonPreview(type: ChartType): string {
  const lines = sampleJSON(type).split("\n")
  // "[", records…, "]": keep the first 3 records.
  if (lines.length <= 5) return lines.join("\n")
  return [...lines.slice(0, 4), "  …", "]"].join("\n")
}

export default async function ChartDetailPage({ params }: ChartDetailPageProps) {
  const { type } = await params

  if (!isChartType(type)) {
    notFound()
  }

  const seo = chartSeo[type]
  const label = chartTypeLabels[type]
  const csv = sampleCsvPreview(type)
  const encoded = await encodeShareConfig({ type, csv: sampleCSV[type], options: {} })
  const imagePath = `/api/chart?c=${encoded}`
  const noChartDependency = type === "heatmap"

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-16 sm:py-20">
      <div className="flex flex-col gap-3">
        <BreadcrumbChip
          items={[
            { label: "Chartcn", href: "/" },
            { label: "Charts", href: "/charts" },
            { label },
          ]}
        />
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{seo.h1}</h1>
        <p className="max-w-2xl text-muted-foreground">{seo.intro}</p>
      </div>

      <Suspense fallback={<ChartDetail type={type} shareParam={null} />}>
        <ChartDetailClient type={type} />
      </Suspense>

      <div className="mt-8 grid grid-cols-1 gap-12 border-t border-border pt-14 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="flex min-w-0 flex-col gap-12 text-[0.95rem] leading-relaxed">
          <section aria-labelledby="when-to-use" className="flex flex-col gap-3">
            <h2 id="when-to-use" className="text-xl font-semibold tracking-tight">
              When to use {seo.noun}
            </h2>
            <p className="text-muted-foreground">{seo.whenToUse.lead}</p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {seo.whenToUse.cases.map((useCase) => (
                <li key={useCase} className="flex items-start gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  {useCase}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="data-format" className="flex flex-col gap-3">
            <h2 id="data-format" className="text-xl font-semibold tracking-tight">
              Data format
            </h2>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-muted-foreground marker:text-primary">
              {seo.dataNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
              <li>{COMMON_DATA_NOTE}</li>
            </ul>
            <div className="grid gap-3 md:grid-cols-2">
              <figure className="flex min-w-0 flex-col gap-1.5">
                <figcaption className="text-xs font-medium text-muted-foreground">
                  CSV{csv.hidden > 0 && ` (first ${PREVIEW_ROWS} of ${PREVIEW_ROWS + csv.hidden} rows)`}
                </figcaption>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs">
                  <code>{csv.text}</code>
                </pre>
              </figure>
              <figure className="flex min-w-0 flex-col gap-1.5">
                <figcaption className="text-xs font-medium text-muted-foreground">
                  Same data as JSON
                </figcaption>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs">
                  <code>{sampleJsonPreview(type)}</code>
                </pre>
              </figure>
            </div>
          </section>

          <section aria-labelledby="options" className="flex flex-col gap-3">
            <h2 id="options" className="text-xl font-semibold tracking-tight">
              Options
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              {seo.options.map((option) => (
                <div key={option.name} className="rounded-lg border border-border p-3">
                  <dt className="font-medium">{option.name}</dt>
                  <dd className="text-sm text-muted-foreground">{option.detail}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="install" className="flex flex-col gap-3">
            <h2 id="install" className="text-xl font-semibold tracking-tight">
              How to add it to your project
            </h2>
            <ol className="flex flex-col gap-4">
              {noChartDependency ? (
                <li className="text-muted-foreground">
                  1. This component is plain React and Tailwind: no chart library to install.
                </li>
              ) : (
                <li className="flex flex-col gap-2">
                  <span>1. Add the shadcn/ui chart component (it installs Recharts):</span>
                  <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 py-1.5 pr-1.5 pl-3">
                    <code className="font-mono text-xs break-all">npx shadcn@latest add chart</code>
                    <CopyButton
                      text="npx shadcn@latest add chart"
                      label="Copy"
                      variant="ghost"
                      size="sm"
                    />
                  </div>
                </li>
              )}
              <li>
                2. Paste your data above, pick the options, and copy the generated{" "}
                <code className="font-mono text-xs break-all">chart.tsx</code>.
              </li>
              <li>
                3. Save it in your project (e.g.{" "}
                <code className="font-mono text-xs break-all">components/{type}-chart.tsx</code>) and
                render <code className="font-mono text-xs break-all">{"<Chart />"}</code>, or{" "}
                <code className="font-mono text-xs break-all">{"<Chart data={rows} />"}</code> in Data
                as prop mode.
              </li>
            </ol>
          </section>

          <section aria-labelledby="faq" className="flex flex-col gap-4">
            <h2 id="faq" className="text-xl font-semibold tracking-tight">
              {label} FAQ
            </h2>
            <FaqList faqs={seo.faqs} />
          </section>
        </article>

        <aside className="flex flex-col gap-8">
          <figure className="flex flex-col gap-2">
            {/* A static render of the sample (served by /api/chart), so the
                page has an indexable image with descriptive alt text. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${BASE_PATH}${imagePath}`}
              alt={seo.imageAlt}
              loading="lazy"
              className="w-full rounded-xl border border-border"
            />
            <figcaption className="text-xs text-muted-foreground">
              {seo.imageAlt}. Rendered from the sample data above.
            </figcaption>
          </figure>

          <nav aria-labelledby="related" className="flex flex-col gap-3">
            <h2 id="related" className="text-sm font-semibold tracking-tight">
              Related charts
            </h2>
            <ul className="flex flex-col gap-2">
              {seo.related.map((related) => (
                <li key={related}>
                  <Link
                    href={`/charts/${related}`}
                    className="group flex items-start justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/40"
                  >
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium group-hover:text-primary">
                        {chartTypeLabels[related]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {chartTypeDescriptions[related]}
                      </span>
                    </span>
                    <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/charts" className="text-xs text-primary hover:underline">
              All {chartTypes.length} chart types →
            </Link>
          </nav>
        </aside>
      </div>

      <JsonLd data={chartPageSchema(type, `${SITE_URL}${imagePath}`)} />
    </main>
  )
}
