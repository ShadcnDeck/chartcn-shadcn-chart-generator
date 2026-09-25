import { describe, expect, it } from "vitest"

import {
  computeHeatmap,
  computeWaterfall,
  filterByRange,
  formatHeatValue,
  heatIntensity,
} from "@/lib/chart-models"
import { parseCSV } from "@/lib/csv-parser"

describe("filterByRange", () => {
  const rows = ["2024-01-01", "2024-01-05", "2024-01-09", "2024-01-10"].map((category) => ({
    category,
  }))

  it("keeps rows within N days of the newest date", () => {
    expect(filterByRange(rows, "7d", true).map((r) => r.category)).toEqual([
      "2024-01-05",
      "2024-01-09",
      "2024-01-10",
    ])
  })

  it("keeps everything for 'all'", () => {
    expect(filterByRange(rows, "all", true)).toHaveLength(4)
  })

  it("falls back to the last N rows without a date axis", () => {
    const labels = Array.from({ length: 10 }, (_, i) => ({ category: `W${i}` }))
    expect(filterByRange(labels, "7d", false).map((r) => r.category)).toEqual([
      "W3", "W4", "W5", "W6", "W7", "W8", "W9",
    ])
  })
})

describe("computeWaterfall", () => {
  const data = parseCSV("Step,Change\nStart,100\nNew,30\nChurn,-50")

  it("walks a running total into floating [low, high] bars", () => {
    const steps = computeWaterfall(data)
    expect(steps.map(({ label, range, kind, end, display }) => ({ label, range, kind, end, display }))).toEqual([
      { label: "Start", range: [0, 100], kind: "total", end: 100, display: "100" },
      { label: "New", range: [100, 130], kind: "increase", end: 130, display: "+30" },
      { label: "Churn", range: [80, 130], kind: "decrease", end: 80, display: "-50" },
      { label: "Total", range: [0, 80], kind: "total", end: 80, display: "80" },
    ])
  })

  it("can omit the final total bar", () => {
    expect(computeWaterfall(data, false).map((s) => s.label)).toEqual(["Start", "New", "Churn"])
  })

  it("handles running totals that go negative", () => {
    const steps = computeWaterfall(parseCSV("Step,Change\nStart,10\nLoss,-30"))
    expect(steps[1].range).toEqual([-20, 10])
    expect(steps[2].range).toEqual([-20, 0])
  })
})

describe("computeHeatmap", () => {
  it("builds a row × column grid with blanks as null", () => {
    const grid = computeHeatmap(parseCSV("Cohort,W0,W1\nJan,100,60\nFeb,100,"))
    expect(grid).toEqual({
      rowLabels: ["Jan", "Feb"],
      columnLabels: ["W0", "W1"],
      cells: [
        [100, 60],
        [100, null],
      ],
      min: 60,
      max: 100,
    })
  })
})

describe("heat helpers", () => {
  it("scales intensity between min and max", () => {
    expect(heatIntensity(60, 60, 100)).toBe(0)
    expect(heatIntensity(80, 60, 100)).toBe(0.5)
    expect(heatIntensity(5, 5, 5)).toBe(1)
  })

  it("formats percentages from fractions or whole percents", () => {
    expect(formatHeatValue(0.42, "percent", 1)).toBe("42%")
    expect(formatHeatValue(42, "percent", 100)).toBe("42%")
    expect(formatHeatValue(4200, "number", 5000)).toBe("4.2K")
  })
})
