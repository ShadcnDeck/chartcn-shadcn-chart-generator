import { Suspense } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { BreadcrumbChip } from "@/components/breadcrumb-chip"
import { ChartDetailClient } from "@/components/chart-detail-client"
import { chartTypeDescriptions, chartTypeLabels, chartTypes } from "@/lib/sample-data"
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

  const label = chartTypeLabels[type]
  const description = `${chartTypeDescriptions[type]} Paste your CSV to preview a ${label.toLowerCase()} and copy a ready to use shadcn/ui and Recharts component.`

  return {
    title: `${label} Generator for Shadcn UI and React`,
    description,
    alternates: {
      canonical: `/charts/${type}`,
    },
    openGraph: {
      title: `${label} Generator for Shadcn UI and React`,
      description,
      url: `/charts/${type}`,
      images: [
        {
          url: "og-banner.jpg",
          width: 1200,
          height: 630,
          alt: `${label} Generator for Shadcn UI and React`,
        },
      ],
    },
  }
}

export default async function ChartDetailPage({ params }: ChartDetailPageProps) {
  const { type } = await params

  if (!isChartType(type)) {
    notFound()
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-16 sm:py-20">
      <div className="flex flex-col gap-3">
        <BreadcrumbChip
          items={[
            { label: "Chartcn", href: "/" },
            { label: "Charts", href: "/charts" },
            { label: chartTypeLabels[type] },
          ]}
        />
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {chartTypeLabels[type]}
        </h1>
        <p className="max-w-lg text-muted-foreground">{chartTypeDescriptions[type]}</p>
      </div>
      <Suspense fallback={null}>
        <ChartDetailClient type={type} />
      </Suspense>
    </main>
  )
}
