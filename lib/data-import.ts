import {
  MAX_ROWS,
  MAX_SERIES,
  parseCSV,
  parseNumericCell,
  recordsToChartData,
} from "@/lib/csv-parser"
import type { ChartDataRow, ParsedChartData } from "@/types/chart"

export type DataFormat = "csv" | "tsv" | "json" | "markdown"

export const DATA_FORMAT_LABELS: Record<DataFormat, string> = {
  csv: "CSV",
  tsv: "TSV",
  json: "JSON",
  markdown: "Markdown",
}

const MARKDOWN_SEPARATOR_RE = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/

/** Best guess at what the user pasted. JSON wins on a leading bracket, a
 * markdown table needs its `|---|` separator line, TSV needs a tab in the
 * header row (what copying cells out of Excel / Google Sheets produces). */
export function detectFormat(text: string): DataFormat {
  const trimmed = text.trim()
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) return "json"

  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim() !== "")
  if (lines.length >= 2 && lines[0].includes("|") && MARKDOWN_SEPARATOR_RE.test(lines[1])) {
    return "markdown"
  }
  if (lines[0]?.includes("\t")) return "tsv"
  return "csv"
}

/** Splits a markdown table into raw cell records, dropping the separator row
 * and the empty cells produced by leading/trailing pipes. Escaped pipes
 * (`\|`) stay inside their cell. */
export function parseMarkdownTable(text: string): string[][] {
  return text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "" && !MARKDOWN_SEPARATOR_RE.test(line))
    .map((line) => {
      let row = line.trim()
      if (row.startsWith("|")) row = row.slice(1)
      if (row.endsWith("|") && !row.endsWith("\\|")) row = row.slice(0, -1)
      return row.split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, "|").trim())
    })
}

export interface JsonSource {
  records: Record<string, unknown>[]
  /** Every field seen across records, in first-seen order. */
  fields: string[]
  /** Fields whose non-blank values are all numbers (or numeric strings). */
  numericFields: string[]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNumericValue(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value)
  if (typeof value === "string") return parseNumericCell(value) !== null
  return false
}

/** Accepts the shapes API responses usually come in:
 * - `[{...}, {...}]` — an array of row objects
 * - `{ "data": [{...}] }` — rows under a wrapper key (the first array of objects found)
 * - `[["Month", "Revenue"], ["Jan", 100]]` — header row + value rows
 * - `{ "Chrome": 275, "Safari": 200 }` — a flat label → number map */
function extractRecords(parsed: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(parsed)) {
    if (parsed.length > 0 && parsed.every(isPlainObject)) return parsed
    if (parsed.length > 1 && parsed.every(Array.isArray)) {
      const [header, ...rows] = parsed as unknown[][]
      const keys = header.map(String)
      return rows.map((row) => Object.fromEntries(keys.map((key, i) => [key, row[i] ?? null])))
    }
    return null
  }

  if (isPlainObject(parsed)) {
    for (const value of Object.values(parsed)) {
      if (Array.isArray(value) && value.length > 0 && value.every(isPlainObject)) {
        return value
      }
    }
    const entries = Object.entries(parsed)
    if (entries.length > 0 && entries.every(([, value]) => isNumericValue(value))) {
      return entries.map(([name, value]) => ({ name, value }))
    }
  }
  return null
}

export function parseJsonSource(text: string): JsonSource | { error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    return { error: `Invalid JSON: ${error instanceof Error ? error.message : "could not parse"}` }
  }

  const records = extractRecords(parsed)
  if (!records || records.length === 0) {
    return {
      error:
        'Expected an array of objects, e.g. [{ "month": "Jan", "revenue": 100 }], or an object wrapping one.',
    }
  }

  const fields: string[] = []
  const seen = new Set<string>()
  records.forEach((record) => {
    Object.keys(record).forEach((key) => {
      if (!seen.has(key)) {
        seen.add(key)
        fields.push(key)
      }
    })
  })

  const numericFields = fields.filter((field) => {
    const values = records.map((r) => r[field]).filter((v) => v !== null && v !== undefined && v !== "")
    return values.length > 0 && values.every(isNumericValue)
  })

  return { records, fields, numericFields }
}

/** Sensible default axes: the first non-numeric field (a label/date) on X,
 * every numeric field on Y. */
export function defaultJsonFields(source: JsonSource): { xField: string; yFields: string[] } {
  const numeric = new Set(source.numericFields)
  const xField = source.fields.find((field) => !numeric.has(field)) ?? source.fields[0]
  const yFields = source.numericFields.filter((field) => field !== xField).slice(0, MAX_SERIES)
  return { xField, yFields }
}

/** Builds chart data from JSON records with the chosen fields. Keeps the
 * user's field names as headers so the generated code uses them verbatim,
 * and keeps numeric X values (e.g. `year: 2024`) as numbers. */
export function jsonToChartData(
  source: JsonSource,
  xField: string,
  yFields: string[]
): ParsedChartData {
  if (!xField || yFields.length === 0) {
    return { headers: [], rows: [], error: "Pick an X field and at least one Y field." }
  }

  const warnings: string[] = []
  const fields = yFields.slice(0, MAX_SERIES)
  if (yFields.length > MAX_SERIES) {
    warnings.push(`Only the first ${MAX_SERIES} Y fields are shown.`)
  }
  let records = source.records
  if (records.length > MAX_ROWS) {
    records = records.slice(0, MAX_ROWS)
    warnings.push(`Only the first ${MAX_ROWS} rows are shown.`)
  }

  const nonNumeric = new Set<string>()
  const rows: ChartDataRow[] = records.map((record) => {
    const rawX = record[xField]
    const row: ChartDataRow = {
      [xField]: typeof rawX === "number" ? rawX : rawX == null ? "" : String(rawX),
    }
    fields.forEach((field) => {
      const raw = record[field]
      if (raw === null || raw === undefined || raw === "") {
        row[field] = null
      } else if (typeof raw === "number" && Number.isFinite(raw)) {
        row[field] = raw
      } else {
        const parsed = typeof raw === "string" ? parseNumericCell(raw) : null
        if (parsed === null) nonNumeric.add(field)
        row[field] = parsed
      }
    })
    return row
  })

  if (nonNumeric.size > 0) {
    const names = [...nonNumeric].map((f) => `"${f}"`).join(", ")
    warnings.push(`Non-numeric values in ${names} were left blank.`)
  }

  return {
    headers: [xField, ...fields],
    rows,
    error: warnings.length > 0 ? warnings.join(" ") : undefined,
  }
}

/** Parses non-JSON pasted text (JSON needs field selection, see jsonToChartData). */
export function parseDelimitedText(text: string, format: Exclude<DataFormat, "json">): ParsedChartData {
  if (format === "markdown") {
    const records = parseMarkdownTable(text)
    return records.length === 0
      ? { headers: [], rows: [], error: "No data provided." }
      : recordsToChartData(records)
  }
  return parseCSV(text, format === "tsv" ? "\t" : undefined)
}
