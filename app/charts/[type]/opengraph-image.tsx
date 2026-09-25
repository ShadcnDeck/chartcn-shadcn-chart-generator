import { ImageResponse } from "next/og"

import { chartSeo } from "@/lib/chart-seo"
import { parseCSV } from "@/lib/csv-parser"
import { chartTypes, sampleCSV } from "@/lib/sample-data"
import { renderStaticChartSvg } from "@/lib/static-chart-svg"
import type { ChartType } from "@/types/chart"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "ChartCN chart preview"

export function generateStaticParams() {
  return chartTypes.map((type) => ({ type }))
}

const CHART_WIDTH = 1016 // 1200 - 2×80 padding - 2×12 frame padding
const CHART_HEIGHT = 400

/** Social / search preview for each chart page: the chart itself (rendered
 * from its sample data), not a shared banner, so every link looks distinct. */
export default async function Image({ params }: { params: Promise<{ type: string }> }) {
  const { type: raw } = await params
  const type = (chartTypes as string[]).includes(raw) ? (raw as ChartType) : "bar"
  const seo = chartSeo[type]

  const svg = renderStaticChartSvg(type, parseCSV(sampleCSV[type]), {}, {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    transparent: true,
  })
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f9f9f7",
          padding: "44px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: "#0b0b0b" }}>
            {seo.h1}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "#2a78d6",
              border: "2px solid rgba(42,120,214,0.3)",
              borderRadius: 999,
              padding: "6px 18px",
            }}
          >
            ChartCN
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#6b6a65", marginTop: 6 }}>
          {type === "heatmap" ? "Copy-paste shadcn/ui React component" : "Copy-paste shadcn/ui + Recharts component"}
          {" · free & open source"}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 26,
            background: "#fcfcfb",
            border: "1px solid rgba(11,11,11,0.1)",
            borderRadius: 20,
            padding: 12,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} width={CHART_WIDTH} height={CHART_HEIGHT} alt="" />
        </div>
      </div>
    ),
    size
  )
}
