"use client"

import { useState, type RefObject } from "react"
import { Check, FileCode, ImageDown, Link as LinkIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  buildChartSvg,
  downloadPng,
  downloadSvg,
  type ExportHeader,
  type ExportLegendItem,
} from "@/lib/export-image"
import { parseCSV } from "@/lib/csv-parser"
import { BASE_PATH } from "@/lib/seo"
import { encodeShareConfig } from "@/lib/share"
import { renderStaticChartSvg } from "@/lib/static-chart-svg"
import type { ChartOptions, ChartType } from "@/types/chart"

interface ImageExportProps {
  /** Wraps the live preview; its Recharts SVG is what gets exported. */
  previewRef: RefObject<HTMLDivElement | null>
  type: ChartType
  csv: string
  options: ChartOptions
  legend: ExportLegendItem[]
  header?: ExportHeader
  footer?: string
  /** Draw the legend under the chart (for charts whose legend isn't Recharts'). */
  legendBelow?: boolean
}

type Copied = "url" | "readme" | null

/** Download the preview as PNG/SVG, or copy a hosted image URL / README
 * snippet that renders this exact chart (served by /api/chart). */
export function ImageExport({
  previewRef,
  type,
  csv,
  options,
  legend,
  header,
  footer,
  legendBelow,
}: ImageExportProps) {
  const [copied, setCopied] = useState<Copied>(null)
  const [error, setError] = useState<string | null>(null)

  async function exportImage(format: "png" | "svg") {
    const container = previewRef.current
    if (!container) return
    try {
      setError(null)
      // The heatmap is an HTML grid, not a Recharts SVG, so its image comes
      // from the static renderer the image URL uses.
      const { svg, width, height } =
        type === "heatmap"
          ? staticSvg(container)
          : buildChartSvg(container, { legend, header, footer, legendBelow })
      const fileName = `${type}-chart.${format}`
      if (format === "svg") downloadSvg(svg, fileName)
      else await downloadPng(svg, width, height, fileName)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Export failed")
    }
  }

  function staticSvg(container: HTMLElement) {
    const width = Math.round(container.getBoundingClientRect().width)
    const height = Math.round(container.getBoundingClientRect().height) + 40
    const theme = document.documentElement.classList.contains("dark") ? "dark" : "light"
    const svg = renderStaticChartSvg(type, parseCSV(csv), options, { theme, width, height })
    return { svg, width, height }
  }

  async function imageUrl(theme: "light" | "dark") {
    // Export mode doesn't affect the image; dropping it keeps the URL stable.
    const encoded = await encodeShareConfig({
      type,
      csv,
      options: { ...options, exportMode: undefined },
    })
    const url = new URL(`${BASE_PATH}/api/chart`, window.location.origin)
    url.searchParams.set("c", encoded)
    if (theme === "dark") url.searchParams.set("theme", "dark")
    return url.toString()
  }

  async function copy(kind: Exclude<Copied, null>) {
    const light = await imageUrl("light")
    let value = light
    if (kind === "readme") {
      // GitHub swaps <picture> sources with the viewer's color scheme.
      const dark = await imageUrl("dark")
      value = [
        "<picture>",
        `  <source media="(prefers-color-scheme: dark)" srcset="${dark}">`,
        `  <img alt="Chart" src="${light}">`,
        "</picture>",
      ].join("\n")
    }
    await navigator.clipboard.writeText(value)
    setCopied(kind)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium text-muted-foreground">Image</span>
        <Button variant="outline" size="sm" onClick={() => exportImage("png")}>
          <ImageDown /> PNG
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportImage("svg")}>
          <ImageDown /> SVG
        </Button>
        <Button variant="outline" size="sm" onClick={() => copy("url")}>
          {copied === "url" ? <Check /> : <LinkIcon />}
          {copied === "url" ? "Copied!" : "Image URL"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => copy("readme")}>
          {copied === "readme" ? <Check /> : <FileCode />}
          {copied === "readme" ? "Copied!" : "README snippet"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
