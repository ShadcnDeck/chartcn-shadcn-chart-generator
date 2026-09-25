import Papa from "papaparse"
import type { ChartDataRow, ChartType, ParsedChartData } from "@/types/chart"

export const MAX_ROWS = 500
export const MAX_SERIES = 10

const THOUSANDS_COMMA_RE = /^-?\d{1,3}(,\d{3})+$/
// Indian numbering (lakh/crore): groups of 2 digits after the first group,
// e.g. "1,03,920" = 103920, "12,34,567" = 1234567.
const INDIAN_GROUPING_RE = /^-?\d{1,2}(,\d{2})+,\d{3}$/

/** Parses a numeric CSV cell, tolerating thousands separators from US
 * ("1,234.5"), European ("1.234,5"), and Indian ("1,03,920") style exports.
 * Returns null when the cell is blank or isn't numeric at all, instead of
 * coercing either to 0. */
export function parseNumericCell(raw: string): number | null {
  const value = raw.trim()
  if (value === "") return null

  // Plain integer/decimal with no separators to disambiguate.
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value)
  }

  const lastComma = value.lastIndexOf(",")
  const lastDot = value.lastIndexOf(".")

  let normalized: string
  if (lastComma !== -1 && lastDot !== -1) {
    // Both separators present: whichever comes last is the decimal mark,
    // the other is thousands-grouping and gets stripped.
    normalized =
      lastComma > lastDot
        ? value.replace(/\./g, "").replace(",", ".")
        : value.replace(/,/g, "")
  } else if (lastComma !== -1) {
    // Only commas: thousands grouping, either US-style ("1,234,567") or
    // Indian lakh/crore-style ("1,03,920"), unless the trailing group isn't
    // 3 digits at all, which means the comma is a decimal mark ("12,5" from
    // a European export).
    normalized =
      THOUSANDS_COMMA_RE.test(value) || INDIAN_GROUPING_RE.test(value)
        ? value.replace(/,/g, "")
        : value.replace(",", ".")
  } else {
    // Only dots: a single dot is a decimal point; repeated dots are
    // thousands grouping ("1.234.567").
    const dotCount = (value.match(/\./g) ?? []).length
    normalized = dotCount > 1 ? value.replace(/\./g, "") : value
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

/** Parses delimited text. `delimiter` defaults to Papa Parse's auto-detection
 * (comma, tab, pipe, semicolon, ...); pass "\t" for known TSV so a value like
 * "1,234" can't sway the guess. */
export function parseCSV(csv: string, delimiter?: string): ParsedChartData {
  const trimmed = csv.trim()

  if (!trimmed) {
    return { headers: [], rows: [], error: "No data provided." }
  }

  const result = Papa.parse<string[]>(trimmed, {
    skipEmptyLines: true,
    delimiter,
  })

  if (result.errors.length > 0) {
    return {
      headers: [],
      rows: [],
      error: result.errors[0].message ?? "Could not parse CSV.",
    }
  }

  return recordsToChartData(result.data)
}

/** Header row + data rows of raw cell strings (from CSV, TSV, or a markdown
 * table) into chart data: column 1 is the category, the rest are numeric. */
export function recordsToChartData(rawRecords: string[][]): ParsedChartData {
  const records = rawRecords.map((row) => row.map((cell) => cell.trim()))

  if (records.length < 2) {
    return {
      headers: [],
      rows: [],
      error: "Data needs a header row and at least one data row.",
    }
  }

  const warnings: string[] = []

  let [headers, ...dataRows] = records
  headers = headers.map((h) => h.trim())

  if (headers.length - 1 > MAX_SERIES) {
    warnings.push(
      `Only the first ${MAX_SERIES} data series columns are shown (found ${headers.length - 1}).`
    )
    headers = [headers[0], ...headers.slice(1, MAX_SERIES + 1)]
  }

  let truncated = false
  if (dataRows.length > MAX_ROWS) {
    truncated = true
    dataRows = dataRows.slice(0, MAX_ROWS)
  }

  const nonNumericColumns = new Set<string>()

  const rows: ChartDataRow[] = dataRows
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => {
      const record: ChartDataRow = {}
      headers.forEach((header, colIndex) => {
        const rawValue = row[colIndex] ?? ""
        if (colIndex === 0) {
          record[header] = rawValue
          return
        }
        if (rawValue === "") {
          record[header] = null
          return
        }
        const numericValue = parseNumericCell(rawValue)
        if (numericValue === null) {
          nonNumericColumns.add(header)
        }
        record[header] = numericValue
      })
      return record
    })

  if (nonNumericColumns.size > 0) {
    const columns = [...nonNumericColumns].map((c) => `"${c}"`).join(", ")
    warnings.push(
      `Non-numeric values in column${nonNumericColumns.size > 1 ? "s" : ""} ${columns} were left blank.`
    )
  }
  if (truncated) {
    warnings.push(`Only the first ${MAX_ROWS} rows are shown.`)
  }

  return {
    headers,
    rows,
    error: warnings.length > 0 ? warnings.join(" ") : undefined,
  }
}

/** Inverse of parseCSV — serializes parsed data back to CSV text, e.g. for
 * sharing/saving so any input tab (paste/upload/table) round-trips the same way. */
export function toCSV(data: ParsedChartData): string {
  const rows = data.rows.map((row) => data.headers.map((header) => row[header] ?? ""))
  return Papa.unparse([data.headers, ...rows])
}

const COLUMN_REQUIREMENTS: Partial<
  Record<ChartType, { count: number; hint: string; name: string }>
> = {
  pie: { count: 2, hint: "Category,Value", name: "Pie" },
  radial: { count: 2, hint: "Category,Value", name: "Radial" },
  scatter: { count: 3, hint: "Category,X,Y", name: "Scatter" },
  kpi: { count: 2, hint: "Period,Value", name: "KPI" },
}

/** Warns when a chart type's fixed CSV shape (e.g. pie/radial's Category,Value or
 * scatter's Category,X,Y) isn't met. Returns undefined when there's nothing to warn about. */
export function validateColumnsForType(type: ChartType, data: ParsedChartData): string | undefined {
  const requirement = COLUMN_REQUIREMENTS[type]
  if (!requirement || data.headers.length === 0) return undefined
  if (data.headers.length === requirement.count) return undefined

  return `${requirement.name} charts expect exactly ${requirement.count} columns (${requirement.hint}).`
}
