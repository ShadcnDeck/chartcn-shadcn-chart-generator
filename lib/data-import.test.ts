import { describe, expect, it } from "vitest"

import {
  defaultJsonFields,
  detectFormat,
  jsonToChartData,
  parseDelimitedText,
  parseJsonSource,
  parseMarkdownTable,
  type JsonSource,
} from "@/lib/data-import"

function source(text: string): JsonSource {
  const result = parseJsonSource(text)
  if ("error" in result) throw new Error(result.error)
  return result
}

describe("detectFormat", () => {
  it("detects JSON arrays and objects", () => {
    expect(detectFormat('[{"a":1}]')).toBe("json")
    expect(detectFormat('  {"data": []}')).toBe("json")
  })

  it("detects markdown tables by their separator row", () => {
    expect(detectFormat("| Month | Revenue |\n|---|---:|\n| Jan | 1 |")).toBe("markdown")
  })

  it("detects TSV copied from a spreadsheet", () => {
    expect(detectFormat("Month\tRevenue\nJan\t1")).toBe("tsv")
  })

  it("falls back to CSV", () => {
    expect(detectFormat("Month,Revenue\nJan,1")).toBe("csv")
  })
})

describe("parseMarkdownTable", () => {
  it("drops the separator row and edge pipes, keeping escaped pipes", () => {
    const records = parseMarkdownTable("| Name | Value |\n| :--- | ---: |\n| a \\| b | 1 |")
    expect(records).toEqual([
      ["Name", "Value"],
      ["a | b", "1"],
    ])
  })
})

describe("parseDelimitedText", () => {
  it("parses TSV values containing commas", () => {
    const data = parseDelimitedText("Month\tRevenue\nJan\t1,234", "tsv")
    expect(data.rows).toEqual([{ Month: "Jan", Revenue: 1234 }])
  })

  it("parses a markdown table into chart data", () => {
    const data = parseDelimitedText("| Month | Revenue |\n|---|---|\n| Jan | 42 |", "markdown")
    expect(data.headers).toEqual(["Month", "Revenue"])
    expect(data.rows).toEqual([{ Month: "Jan", Revenue: 42 }])
  })
})

describe("parseJsonSource", () => {
  it("reads an array of objects and finds numeric fields", () => {
    const result = source('[{"month":"Jan","revenue":100,"cost":"50"},{"month":"Feb","revenue":120}]')
    expect(result.fields).toEqual(["month", "revenue", "cost"])
    expect(result.numericFields).toEqual(["revenue", "cost"])
  })

  it("unwraps rows under a wrapper key", () => {
    expect(source('{"total":2,"data":[{"x":"a","y":1}]}').records).toEqual([{ x: "a", y: 1 }])
  })

  it("accepts a header row plus value rows", () => {
    expect(source('[["month","revenue"],["Jan",1]]').records).toEqual([{ month: "Jan", revenue: 1 }])
  })

  it("turns a flat label → number map into name/value rows", () => {
    expect(source('{"Chrome":275,"Safari":200}').records).toEqual([
      { name: "Chrome", value: 275 },
      { name: "Safari", value: 200 },
    ])
  })

  it("reports invalid JSON and unsupported shapes", () => {
    expect(parseJsonSource("[{")).toHaveProperty("error")
    expect(parseJsonSource('"just a string"')).toHaveProperty("error")
  })
})

describe("defaultJsonFields", () => {
  it("puts the first non-numeric field on X and numeric fields on Y", () => {
    const result = source('[{"revenue":1,"month":"Jan","cost":2}]')
    expect(defaultJsonFields(result)).toEqual({ xField: "month", yFields: ["revenue", "cost"] })
  })
})

describe("jsonToChartData", () => {
  it("keeps field names as headers and numeric X values as numbers", () => {
    const result = source('[{"year":2023,"total sales":"1,200","note":"x"},{"year":2024,"total sales":null}]')
    const data = jsonToChartData(result, "year", ["total sales"])
    expect(data.headers).toEqual(["year", "total sales"])
    expect(data.rows).toEqual([
      { year: 2023, "total sales": 1200 },
      { year: 2024, "total sales": null },
    ])
    expect(data.error).toBeUndefined()
  })

  it("warns about non-numeric Y values", () => {
    const result = source('[{"m":"Jan","v":"n/a"}]')
    expect(jsonToChartData(result, "m", ["v"]).error).toContain('"v"')
  })

  it("requires at least one Y field", () => {
    expect(jsonToChartData(source('[{"m":"Jan"}]'), "m", []).error).toBeDefined()
  })
})
