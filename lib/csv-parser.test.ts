import { describe, expect, it } from "vitest"

import { parseCSV, parseNumericCell, toCSV, validateColumnsForType } from "@/lib/csv-parser"

describe("parseCSV", () => {
  it("parses a valid CSV into headers and numeric rows", () => {
    const result = parseCSV("Month,Revenue\nJan,100\nFeb,200")
    expect(result.error).toBeUndefined()
    expect(result.headers).toEqual(["Month", "Revenue"])
    expect(result.rows).toEqual([
      { Month: "Jan", Revenue: 100 },
      { Month: "Feb", Revenue: 200 },
    ])
  })

  it("errors on empty input", () => {
    expect(parseCSV("").error).toBe("No data provided.")
  })

  it("errors when there's no data row", () => {
    expect(parseCSV("Month,Revenue").error).toBe(
      "CSV needs a header row and at least one data row."
    )
  })

  it("leaves genuinely non-numeric values blank and names the column", () => {
    const result = parseCSV("Month,Revenue\nJan,abc")
    expect(result.rows).toEqual([{ Month: "Jan", Revenue: null }])
    expect(result.error).toContain('Non-numeric values in column "Revenue" were left blank')
  })

  it("leaves blank cells as null instead of 0", () => {
    const result = parseCSV("Month,Revenue\nJan,100\nFeb,")
    expect(result.rows).toEqual([
      { Month: "Jan", Revenue: 100 },
      { Month: "Feb", Revenue: null },
    ])
    expect(result.error).toBeUndefined()
  })

  it("parses US-style thousands separators", () => {
    const result = parseCSV("Month,Revenue\nJan,\"1,234.5\"")
    expect(result.rows).toEqual([{ Month: "Jan", Revenue: 1234.5 }])
    expect(result.error).toBeUndefined()
  })

  it("parses European-style thousands separators", () => {
    const result = parseCSV("Month,Revenue\nJan,\"1.234,5\"")
    expect(result.rows).toEqual([{ Month: "Jan", Revenue: 1234.5 }])
    expect(result.error).toBeUndefined()
  })

  it("truncates series beyond the max and warns", () => {
    const headers = ["Category", ...Array.from({ length: 12 }, (_, i) => `Series${i}`)]
    const row = ["A", ...Array.from({ length: 12 }, (_, i) => String(i))]
    const csv = [headers.join(","), row.join(",")].join("\n")

    const result = parseCSV(csv)
    expect(result.headers).toHaveLength(11) // category + 10 series
    expect(result.error).toContain("Only the first 10 data series columns are shown")
  })

  it("truncates rows beyond the max and warns", () => {
    const rows = Array.from({ length: 501 }, (_, i) => `Row${i},${i}`)
    const csv = ["Category,Value", ...rows].join("\n")

    const result = parseCSV(csv)
    expect(result.rows).toHaveLength(500)
    expect(result.error).toContain("Only the first 500 rows are shown")
  })
})

describe("parseNumericCell", () => {
  it("parses plain integers and decimals", () => {
    expect(parseNumericCell("42")).toBe(42)
    expect(parseNumericCell("12.5")).toBe(12.5)
    expect(parseNumericCell("-7")).toBe(-7)
  })

  it("returns null for blank cells", () => {
    expect(parseNumericCell("")).toBeNull()
    expect(parseNumericCell("   ")).toBeNull()
  })

  it("returns null for genuinely non-numeric text", () => {
    expect(parseNumericCell("abc")).toBeNull()
  })

  it("treats a lone comma-grouped value as US thousands", () => {
    expect(parseNumericCell("1,234")).toBe(1234)
    expect(parseNumericCell("1,234,567")).toBe(1234567)
  })

  it("treats a short trailing group after a comma as a European decimal", () => {
    expect(parseNumericCell("12,5")).toBe(12.5)
  })

  it("disambiguates mixed separators by which comes last", () => {
    expect(parseNumericCell("1,234.5")).toBe(1234.5)
    expect(parseNumericCell("1.234,5")).toBe(1234.5)
  })

  it("parses Indian lakh/crore-style grouping", () => {
    expect(parseNumericCell("1,03,920")).toBe(103920)
    expect(parseNumericCell("12,34,567")).toBe(1234567)
    expect(parseNumericCell("1,23,45,678")).toBe(12345678)
    expect(parseNumericCell("1,03,920.50")).toBe(103920.5)
  })

  it("treats repeated dots as European thousands grouping", () => {
    expect(parseNumericCell("1.234.567")).toBe(1234567)
  })
})

describe("toCSV", () => {
  it("round-trips through parseCSV", () => {
    const original = parseCSV("Month,Revenue,Expenses\nJan,100,50\nFeb,200,80")
    const csvText = toCSV(original)
    const reparsed = parseCSV(csvText)

    expect(reparsed.headers).toEqual(original.headers)
    expect(reparsed.rows).toEqual(original.rows)
  })
})

describe("validateColumnsForType", () => {
  it("warns when pie doesn't have exactly 2 columns", () => {
    const data = parseCSV("Category,Value,Extra\nA,1,2")
    expect(validateColumnsForType("pie", data)).toContain("expect exactly 2 columns")
  })

  it("passes pie with exactly 2 columns", () => {
    const data = parseCSV("Category,Value\nA,1")
    expect(validateColumnsForType("pie", data)).toBeUndefined()
  })

  it("warns when scatter doesn't have exactly 3 columns", () => {
    const data = parseCSV("Category,Value\nA,1")
    expect(validateColumnsForType("scatter", data)).toContain("expect exactly 3 columns")
  })

  it("passes scatter with exactly 3 columns", () => {
    const data = parseCSV("Category,X,Y\nA,1,2")
    expect(validateColumnsForType("scatter", data)).toBeUndefined()
  })

  it("has no requirement for bar charts", () => {
    const data = parseCSV("Category,A,B,C\nRow,1,2,3")
    expect(validateColumnsForType("bar", data)).toBeUndefined()
  })
})
