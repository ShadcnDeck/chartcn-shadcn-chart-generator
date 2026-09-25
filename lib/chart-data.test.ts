import { describe, expect, it } from "vitest"

import {
  computeGrowth,
  computeKpi,
  getExportFields,
  getSeries,
  isDateAxis,
  isSafeColor,
  resolveColor,
  sortRowsByFirstSeries,
  toChartRows,
  toExportRows,
  toPropertyAccess,
  toPropertyKey,
  toScatterGroups,
} from "@/lib/chart-data"
import { parseCSV } from "@/lib/csv-parser"

describe("getSeries", () => {
  it("sanitizes header names with spaces and symbols into safe keys", () => {
    const data = parseCSV("Month,Product A,Revenue (USD)\nJan,1,2")
    expect(getSeries(data)).toEqual([
      { key: "series_Product_A", label: "Product A" },
      { key: "series_Revenue_USD", label: "Revenue (USD)" },
    ])
  })
})

describe("toChartRows", () => {
  it("remaps rows to category + safe series keys", () => {
    const data = parseCSV("Month,Revenue\nJan,100")
    expect(toChartRows(data)).toEqual([{ category: "Jan", series_Revenue: 100 }])
  })
})

describe("resolveColor", () => {
  it("falls back to the palette when no custom color is set", () => {
    expect(resolveColor("series_a", 0)).toBe("var(--chart-1)")
    expect(resolveColor("series_a", 1)).toBe("var(--chart-2)")
  })

  it("uses the custom color when one is set for the key", () => {
    expect(resolveColor("series_a", 0, { series_a: "#ff0000" })).toBe("#ff0000")
  })
})

describe("computeGrowth", () => {
  it("returns null when there are fewer than 2 rows", () => {
    const data = parseCSV("Month,Revenue\nJan,100")
    expect(computeGrowth(data)).toBeNull()
  })

  it("returns null when the baseline is zero", () => {
    const data = parseCSV("Month,Revenue\nJan,0\nFeb,100")
    expect(computeGrowth(data)).toBeNull()
  })

  it("computes percent change from first to last row", () => {
    const data = parseCSV("Month,Revenue\nJan,100\nFeb,150")
    expect(computeGrowth(data)).toBe(50)
  })
})

describe("isDateAxis", () => {
  it("detects ISO dates in the category column", () => {
    const data = parseCSV("Date,Value\n2024-01-01,10\n2024-02-01,20")
    expect(isDateAxis(data)).toBe(true)
  })

  it("detects slash dates in the category column", () => {
    const data = parseCSV("Date,Value\n1/5/2024,10\n2/5/2024,20")
    expect(isDateAxis(data)).toBe(true)
  })

  it("returns false for non-date categories", () => {
    const data = parseCSV("Month,Value\nJan,10\nFeb,20")
    expect(isDateAxis(data)).toBe(false)
  })
})

describe("toScatterGroups", () => {
  it("groups rows by category into per-group point lists", () => {
    const data = parseCSV("Segment,X,Y\nA,1,2\nA,3,4\nB,5,6")
    const groups = toScatterGroups(data)

    expect(groups).toEqual([
      { key: "A", label: "A", color: "var(--chart-1)", points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] },
      { key: "B", label: "B", color: "var(--chart-2)", points: [{ x: 5, y: 6 }] },
    ])
  })
})

describe("getExportFields / toExportRows", () => {
  it("uses the real headers, quoting nothing and renaming only path-like keys", () => {
    const data = parseCSV("Month,Product A,v1.2\nJan,1,2")
    const { category, series } = getExportFields(data)
    expect(category).toMatchObject({ key: "Month", cssSafe: true })
    expect(series.map(({ key, cssSafe }) => ({ key, cssSafe }))).toEqual([
      { key: "Product A", cssSafe: false },
      { key: "v1_2", cssSafe: true },
    ])
    expect(toExportRows(data)).toEqual([{ Month: "Jan", "Product A": 1, v1_2: 2 }])
  })

  it("de-duplicates keys that collide after renaming", () => {
    const data = parseCSV("Month,a.b,a_b\nJan,1,2")
    expect(getExportFields(data).series.map((s) => s.key)).toEqual(["a_b", "a_b_2"])
  })
})

describe("toPropertyKey / toPropertyAccess", () => {
  it("leaves identifiers bare and quotes everything else", () => {
    expect(toPropertyKey("revenue")).toBe("revenue")
    expect(toPropertyKey("total sales")).toBe('"total sales"')
    expect(toPropertyAccess("row", "revenue")).toBe("row.revenue")
    expect(toPropertyAccess("row", "total sales")).toBe('row["total sales"]')
  })
})

describe("computeKpi", () => {
  it("returns the latest value and change vs. the previous non-blank value", () => {
    const data = parseCSV("Month,MRR\nJan,100\nFeb,\nMar,125")
    expect(computeKpi(data)).toMatchObject({
      label: "MRR",
      latest: 125,
      previous: 100,
      delta: 25,
      firstCategory: "Jan",
      lastCategory: "Mar",
    })
  })
})

describe("sortRowsByFirstSeries", () => {
  it("sorts descending and ascending without mutating the input", () => {
    const rows = [{ v: 2 }, { v: 3 }, { v: 1 }]
    expect(sortRowsByFirstSeries(rows, "v", "desc").map((r) => r.v)).toEqual([3, 2, 1])
    expect(sortRowsByFirstSeries(rows, "v", "asc").map((r) => r.v)).toEqual([1, 2, 3])
    expect(rows.map((r) => r.v)).toEqual([2, 3, 1])
  })
})

describe("isSafeColor", () => {
  it("accepts plain colors and palette variables", () => {
    for (const color of ["#fff", "#2a78d6", "rgb(1, 2, 3)", "oklch(0.6 0.2 250)", "var(--chart-3)"]) {
      expect(isSafeColor(color)).toBe(true)
    }
  })

  it("rejects anything that could break out of CSS or an attribute", () => {
    for (const color of ['red"/><script>', "red;}body{display:none", "url(x)", "var(--x)", 42]) {
      expect(isSafeColor(color)).toBe(false)
    }
  })
})
