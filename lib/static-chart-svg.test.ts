import { describe, expect, it } from "vitest"

import { parseCSV } from "@/lib/csv-parser"
import { chartTypes, sampleCSV } from "@/lib/sample-data"
import { monotonePath, niceScale, renderStaticChartSvg } from "@/lib/static-chart-svg"

describe("niceScale", () => {
  it("rounds the domain out to nice ticks", () => {
    expect(niceScale(0, 72000)).toEqual({
      min: 0,
      max: 80000,
      ticks: [0, 20000, 40000, 60000, 80000],
    })
  })

  it("handles a flat domain", () => {
    expect(niceScale(5, 5).ticks.length).toBeGreaterThan(1)
  })
})

describe("monotonePath", () => {
  it("draws cubic segments through every point", () => {
    const d = monotonePath([
      [0, 10],
      [10, 0],
      [20, 5],
    ])
    expect(d.startsWith("M0,10")).toBe(true)
    expect(d.match(/C/g)).toHaveLength(2)
    expect(d.endsWith("20,5")).toBe(true)
  })
})

describe("renderStaticChartSvg", () => {
  it.each(chartTypes)("renders a standalone SVG for %s", (type) => {
    const svg = renderStaticChartSvg(type, parseCSV(sampleCSV[type]))
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(svg).not.toContain("NaN")
    expect(svg).not.toContain("undefined")
    expect(svg).not.toContain("var(--")
  })

  it("uses the dark palette when asked", () => {
    const data = parseCSV(sampleCSV.bar)
    expect(renderStaticChartSvg("bar", data, {}, { theme: "light" })).toContain("#2a78d6")
    expect(renderStaticChartSvg("bar", data, {}, { theme: "dark" })).toContain("#3987e5")
  })

  it("escapes user text", () => {
    const data = parseCSV('Month,Revenue\n"<script>alert(1)</script>",1')
    const svg = renderStaticChartSvg("bar", data, {}, { title: '"><img src=x>' })
    expect(svg).not.toContain("<script>")
    expect(svg).not.toContain("<img")
  })

  it("replaces unsafe custom colors with the palette", () => {
    const data = parseCSV(sampleCSV.bar)
    const svg = renderStaticChartSvg("bar", data, {
      customColors: { series_Revenue: 'red"/><script>alert(1)</script>' },
    })
    expect(svg).not.toContain("<script>")
    expect(svg).toContain("#2a78d6")
  })

  it("honors custom colors and size, and clamps extreme sizes", () => {
    const data = parseCSV(sampleCSV.bar)
    const svg = renderStaticChartSvg("bar", data, { customColors: { series_Revenue: "#ff0000" } }, {
      width: 99999,
      height: 300,
    })
    expect(svg).toContain("#ff0000")
    expect(svg).toContain('width="2000" height="300"')
  })

  it("renders a placeholder for empty data", () => {
    expect(renderStaticChartSvg("line", parseCSV(""))).toContain("No data")
  })
})
