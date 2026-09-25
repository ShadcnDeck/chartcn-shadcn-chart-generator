/** Client-side PNG/SVG export of the live chart preview.
 *
 * Recharts draws the plot as SVG but the shadcn legend (and the KPI card's
 * headline) as HTML, and colors come from CSS variables and Tailwind classes
 * that don't exist outside this page. So the export clones the chart's SVG,
 * bakes each element's computed styles in as inline styles, and redraws the
 * legend / header as SVG around it. */

export interface ExportLegendItem {
  label: string
  color: string
}

export interface ExportHeader {
  label: string
  value: string
  badge?: { text: string; positive: boolean }
}

export interface ExportImageOptions {
  legend: ExportLegendItem[]
  header?: ExportHeader
  footer?: string
}

const STYLE_PROPS = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "stop-color",
  "stop-opacity",
  "font-family",
  "font-size",
  "font-weight",
  "text-anchor",
  "dominant-baseline",
  "visibility",
] as const

const PADDING = 20
const LEGEND_ROW_HEIGHT = 22
const FONT_FALLBACK = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (char) => `&#${char.charCodeAt(0)};`)
}

/** Resolves any CSS color (var(), oklch(), ...) against `context` to rgb(). */
export function resolveCssColor(color: string, context: Element): string {
  const probe = document.createElement("span")
  probe.style.color = color
  probe.style.display = "none"
  context.appendChild(probe)
  const resolved = getComputedStyle(probe).color
  probe.remove()
  return resolved || color
}

function inlineComputedStyles(source: Element, target: Element) {
  const computed = getComputedStyle(source)
  const declarations = STYLE_PROPS.map((prop) => {
    let value = computed.getPropertyValue(prop)
    // Web fonts don't load inside an exported image; fall back to a sans
    // stack instead of the renderer's default serif.
    if (prop === "font-family" && value) value = `${value}, ${FONT_FALLBACK}`
    return value ? `${prop}:${value}` : ""
  }).filter(Boolean)
  target.setAttribute("style", declarations.join(";"))
  target.removeAttribute("class")

  const sourceChildren = source.children
  const targetChildren = target.children
  for (let i = 0; i < sourceChildren.length; i++) {
    if (targetChildren[i]) inlineComputedStyles(sourceChildren[i], targetChildren[i])
  }
}

let measureCanvas: HTMLCanvasElement | null = null
function textWidth(text: string, font: string): number {
  measureCanvas ??= document.createElement("canvas")
  const ctx = measureCanvas.getContext("2d")
  if (!ctx) return text.length * 7
  ctx.font = font
  return ctx.measureText(text).width
}

/** Lays legend items out in centered rows that fit `width`. */
function renderLegend(
  items: ExportLegendItem[],
  width: number,
  top: number,
  textColor: string,
  fontFamily: string
): { svg: string; height: number } {
  if (items.length === 0) return { svg: "", height: 0 }
  const font = `12px ${fontFamily}`
  const measured = items.map((item) => ({ ...item, w: 10 + 6 + textWidth(item.label, font) }))
  const gap = 16
  const rows: (typeof measured)[] = [[]]
  let rowWidth = 0
  measured.forEach((item) => {
    const needed = rowWidth === 0 ? item.w : rowWidth + gap + item.w
    if (needed > width - PADDING * 2 && rowWidth > 0) {
      rows.push([item])
      rowWidth = item.w
    } else {
      rows[rows.length - 1].push(item)
      rowWidth = needed
    }
  })

  const parts: string[] = []
  rows.forEach((row, rowIndex) => {
    const total = row.reduce((sum, item) => sum + item.w, 0) + gap * (row.length - 1)
    let x = (width - total) / 2
    const y = top + rowIndex * LEGEND_ROW_HEIGHT
    row.forEach((item) => {
      parts.push(
        `<rect x="${x}" y="${y + 1}" width="10" height="10" rx="2" fill="${escapeXml(item.color)}"/>`,
        `<text x="${x + 16}" y="${y + 10}" font-size="12" fill="${textColor}">${escapeXml(item.label)}</text>`
      )
      x += item.w + gap
    })
  })
  return { svg: parts.join(""), height: rows.length * LEGEND_ROW_HEIGHT }
}

/** Builds a standalone SVG of the chart inside `container`. */
export function buildChartSvg(
  container: HTMLElement,
  options: ExportImageOptions
): { svg: string; width: number; height: number } {
  const source = container.querySelector<SVGSVGElement>("svg.recharts-surface")
  if (!source) throw new Error("No chart to export")

  const chartWidth = source.width.baseVal.value || source.getBoundingClientRect().width
  const chartHeight = source.height.baseVal.value || source.getBoundingClientRect().height
  const width = Math.round(chartWidth + PADDING * 2)

  const computed = getComputedStyle(container)
  const fontFamily = `${computed.fontFamily}, ${FONT_FALLBACK}`
  const background = resolveCssColor("var(--card)", container)
  const foreground = resolveCssColor("var(--foreground)", container)
  const muted = resolveCssColor("var(--muted-foreground)", container)

  const clone = source.cloneNode(true) as SVGSVGElement
  inlineComputedStyles(source, clone)
  clone.querySelectorAll(".recharts-tooltip-cursor, .recharts-active-dot").forEach((el) => el.remove())

  const parts: string[] = []
  let y = PADDING

  if (options.header) {
    const { label, value, badge } = options.header
    parts.push(
      `<text x="${PADDING}" y="${y + 14}" font-size="14" fill="${muted}">${escapeXml(label)}</text>`,
      `<text x="${PADDING}" y="${y + 50}" font-size="32" font-weight="600" fill="${foreground}">${escapeXml(value)}</text>`
    )
    if (badge) {
      const color = badge.positive ? "#059669" : "#dc2626"
      const w = textWidth(badge.text, `500 12px ${fontFamily}`) + 16
      parts.push(
        `<rect x="${width - PADDING - w}" y="${y}" width="${w}" height="22" rx="11" fill="${color}" fill-opacity="0.12"/>`,
        `<text x="${width - PADDING - w / 2}" y="${y + 15}" font-size="12" font-weight="500" text-anchor="middle" fill="${color}">${escapeXml(badge.text)}</text>`
      )
    }
    y += 66
  }

  const chartTop = y
  clone.setAttribute("x", String(PADDING))
  clone.setAttribute("y", String(chartTop))
  clone.setAttribute("width", String(chartWidth))
  clone.setAttribute("height", String(chartHeight))
  clone.removeAttribute("style")
  parts.push(clone.outerHTML)
  y += chartHeight

  // Recharts reserves room for its (HTML) legend inside the SVG, so the SVG
  // legend goes in that same slot. No legend wrapper means no legend shown.
  const legendWrapper = container.querySelector<HTMLElement>(".recharts-legend-wrapper")
  if (legendWrapper && options.legend.length > 0) {
    const surfaceBox = source.getBoundingClientRect()
    const legendBox = legendWrapper.getBoundingClientRect()
    const legendItems = options.legend.map((item) => ({
      ...item,
      color: resolveCssColor(item.color, container),
    }))
    const slotTop = chartTop + (legendBox.top - surfaceBox.top)
    const probe = renderLegend(legendItems, width, 0, foreground, fontFamily)
    const top = slotTop + Math.max(0, (legendBox.height - probe.height) / 2)
    const legend = renderLegend(legendItems, width, top, foreground, fontFamily)
    parts.push(legend.svg)
    y = Math.max(y, top + legend.height)
  }
  y += 8

  if (options.footer) {
    parts.push(
      `<text x="${PADDING}" y="${y + 12}" font-size="12" fill="${muted}">${escapeXml(options.footer)}</text>`
    )
    y += 20
  }

  const height = Math.round(y + PADDING)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${escapeXml(fontFamily)}"><rect width="100%" height="100%" rx="12" fill="${background}"/>${parts.join("")}</svg>`
  return { svg, width, height }
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadSvg(svg: string, fileName: string) {
  download(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), fileName)
}

/** Rasterizes the SVG at `scale`x (crisp on retina screens and in slides). */
export async function downloadPng(
  svg: string,
  width: number,
  height: number,
  fileName: string,
  scale = 2
) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }))
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement("canvas")
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas is not supported")
    ctx.scale(scale, scale)
    ctx.drawImage(image, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
    if (!blob) throw new Error("Could not encode PNG")
    download(blob, fileName)
  } finally {
    URL.revokeObjectURL(url)
  }
}
