import { describe, expect, it } from "vitest"

import { chartSeo } from "@/lib/chart-seo"
import { chartTypes } from "@/lib/sample-data"
import { chartPageSchema, gallerySchema, homeSchema } from "@/lib/schema"
import { SITE_NAME } from "@/lib/seo"

const TITLE_SUFFIX = ` | ${SITE_NAME}`

/** JSON-LD graph nodes as plain parsed JSON (their shapes differ by @type). */
function graphNodes(schema: object) {
  return JSON.parse(JSON.stringify(schema))["@graph"] as { "@type": string; [key: string]: unknown }[]
}

describe("chartSeo", () => {
  it.each(chartTypes)("%s has a title that fits in search results (≤ 60 chars)", (type) => {
    expect((chartSeo[type].title + TITLE_SUFFIX).length).toBeLessThanOrEqual(60)
  })

  it.each(chartTypes)("%s has a meta description of 70–160 chars", (type) => {
    const { length } = chartSeo[type].description
    expect(length).toBeGreaterThanOrEqual(70)
    expect(length).toBeLessThanOrEqual(160)
  })

  it("gives every page a unique keyword, title, description, and H1", () => {
    for (const field of ["keyword", "title", "description", "h1"] as const) {
      const values = chartTypes.map((type) => chartSeo[type][field])
      expect(new Set(values).size).toBe(values.length)
    }
  })

  it.each(chartTypes)("%s links to 3 other, existing chart pages", (type) => {
    const { related } = chartSeo[type]
    expect(related).toHaveLength(3)
    for (const other of related) {
      expect(chartTypes).toContain(other)
      expect(other).not.toBe(type)
    }
  })

  it.each(chartTypes)("%s has at least 3 FAQs and the keyword in its title or H1", (type) => {
    const seo = chartSeo[type]
    expect(seo.faqs.length).toBeGreaterThanOrEqual(3)
    const firstWord = seo.keyword.split(" ").at(-1)!.toLowerCase()
    expect(`${seo.title} ${seo.h1}`.toLowerCase()).toContain(firstWord)
  })
})

describe("structured data", () => {
  it.each(chartTypes)("%s page schema carries its breadcrumb, component, and FAQs", (type) => {
    const schema = chartPageSchema(type, "https://example.com/image.svg")
    const byType = Object.fromEntries(graphNodes(schema).map((node) => [node["@type"], JSON.parse(JSON.stringify(node))]))

    expect(byType.BreadcrumbList.itemListElement).toHaveLength(3)
    expect(byType.SoftwareSourceCode.programmingLanguage.name).toBe("TypeScript")
    // FAQPage must mirror the FAQs visible on the page.
    expect(byType.FAQPage.mainEntity.map((q: { name: string }) => q.name)).toEqual(
      chartSeo[type].faqs.map((faq) => faq.question)
    )
    expect(JSON.stringify(schema)).not.toMatch(/"(aggregateRating|review)"/)
  })

  it("lists every chart on the gallery page", () => {
    const page = graphNodes(gallerySchema()).find((node) => node["@type"] === "CollectionPage")
    expect(page?.mainEntity).toMatchObject({ numberOfItems: chartTypes.length })
  })

  it("puts the organization, website, app, and FAQ on the home page", () => {
    const types = graphNodes(homeSchema([{ question: "Q?", answer: "A." }])).map((n) => n["@type"])
    expect(types).toEqual(
      expect.arrayContaining(["Organization", "WebSite", "WebApplication", "FAQPage"])
    )
  })
})
