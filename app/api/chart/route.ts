import { parseCSV } from "@/lib/csv-parser"
import { chartTypes } from "@/lib/sample-data"
import { decodeShareConfig } from "@/lib/share"
import { escapeXml, renderStaticChartSvg, type StaticTheme } from "@/lib/static-chart-svg"

// The SVG is built from a user-supplied share payload and served from this
// origin, so lock it down: no scripts, no external loads, no MIME sniffing.
const SECURITY_HEADERS = {
  "Content-Type": "image/svg+xml; charset=utf-8",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
  "X-Content-Type-Options": "nosniff",
}

function errorSvg(message: string, status: number): Response {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="80" viewBox="0 0 480 80" font-family="ui-sans-serif, system-ui, sans-serif"><rect width="100%" height="100%" rx="12" fill="#fcfcfb" stroke="rgba(11,11,11,0.1)"/><text x="20" y="45" font-size="14" fill="#d03b3b">${escapeXml(message)}</text></svg>`
  return new Response(svg, {
    status,
    headers: { ...SECURITY_HEADERS, "Cache-Control": "no-store" },
  })
}

function intParam(value: string | null): number | undefined {
  const parsed = value ? Number.parseInt(value, 10) : NaN
  return Number.isFinite(parsed) ? parsed : undefined
}

/** GET /api/chart?c=<share payload>&theme=light|dark&w=800&h=400&title=...&bg=transparent
 *
 * Renders a chart as a static SVG for READMEs, docs, and Notion. The whole
 * chart lives in the `c` param (same encoding as share links), so the
 * response for a URL never changes and can be cached forever. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const encoded = searchParams.get("c")
  if (!encoded) return errorSvg("Missing ?c= chart parameter", 400)

  const config = await decodeShareConfig(encoded)
  if (!config || !chartTypes.includes(config.type)) {
    return errorSvg("Invalid or corrupted chart link", 400)
  }

  const theme: StaticTheme = searchParams.get("theme") === "dark" ? "dark" : "light"
  const svg = renderStaticChartSvg(config.type, parseCSV(config.csv), config.options, {
    theme,
    width: intParam(searchParams.get("w")),
    height: intParam(searchParams.get("h")),
    title: searchParams.get("title") ?? undefined,
    transparent: searchParams.get("bg") === "transparent",
  })

  return new Response(svg, {
    headers: {
      ...SECURITY_HEADERS,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
