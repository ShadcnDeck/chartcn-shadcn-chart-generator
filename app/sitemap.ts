import type { MetadataRoute } from "next"

import { releases } from "@/lib/changelog"
import { chartSeo } from "@/lib/chart-seo"
import { chartTypes } from "@/lib/sample-data"
import { PAGE_UPDATED, SITE_URL } from "@/lib/seo"

export default function sitemap(): MetadataRoute.Sitemap {
  const chartPages: MetadataRoute.Sitemap = chartTypes.map((type) => ({
    url: `${SITE_URL}/charts/${type}`,
    lastModified: chartSeo[type].updated,
    changeFrequency: "monthly",
    priority: 0.8,
  }))

  return [
    {
      url: SITE_URL,
      lastModified: PAGE_UPDATED.home,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/charts`,
      lastModified: PAGE_UPDATED.charts,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...chartPages,
    {
      url: `${SITE_URL}/changelog`,
      lastModified: releases[0].date,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ]
}
