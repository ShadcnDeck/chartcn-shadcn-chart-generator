import { generateComponentCode } from "@/lib/code-templates"
import { parseCSV } from "@/lib/csv-parser"
import { chartTypeLabels, chartTypes } from "@/lib/sample-data"
import { parseShareConfig, type ShareConfig } from "@/lib/share"

/** Largest chart upload we accept. A maxed-out chart (500 rows x 10 series,
 * see csv-parser) stays well under this; anything bigger isn't a real chart. */
export const MAX_REGISTRY_BYTES = 100_000

/** Install ids are the first 10 hex chars of the config's SHA-256: the same
 * chart always gets the same id, so re-clicking "Get command" is a no-op. */
export const REGISTRY_ID_PATTERN = /^[0-9a-f]{10}$/

export async function registryIdFor(config: ShareConfig): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(config))
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))
  return Array.from(digest.slice(0, 5), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/** Parses and validates an uploaded chart. Returns null for anything that
 * isn't a supported chart type with at least one data row. */
export function parseRegistryUpload(body: string): ShareConfig | null {
  if (body.length > MAX_REGISTRY_BYTES) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return null
  }
  const config = parseShareConfig(parsed)
  if (!config || !chartTypes.includes(config.type)) return null
  if (parseCSV(config.csv).rows.length === 0) return null
  return config
}

/** "bar-chart-1a2b3c" -> file name; "BarChart1a2b3c" -> exported component.
 * The id suffix keeps two installed charts of the same type from colliding. */
function registryNames(id: string, config: ShareConfig) {
  const name = `${config.type}-chart-${id.slice(0, 6)}`
  const componentName = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
  return { name, componentName }
}

/** Builds the shadcn registry item the CLI installs for `npx shadcn add <url>`.
 * See https://ui.shadcn.com/docs/registry/registry-item-json */
export function buildRegistryItem(id: string, config: ShareConfig) {
  const { name, componentName } = registryNames(id, config)
  const code = generateComponentCode(config.type, parseCSV(config.csv), config.options).replace(
    "export function Chart(",
    `export function ${componentName}(`
  )
  const usage =
    config.options.exportMode === "props" ? `<${componentName} data={yourData} />` : `<${componentName} />`

  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name,
    type: "registry:component",
    title: chartTypeLabels[config.type],
    description: "A chart component generated with ChartCN by ShadcnDeck.",
    registryDependencies: ["chart"],
    files: [
      {
        path: `components/charts/${name}.tsx`,
        type: "registry:component",
        content: code,
      },
    ],
    docs: `Import it with: import { ${componentName} } from "@/components/charts/${name}"\nThen render ${usage}`,
  }
}
