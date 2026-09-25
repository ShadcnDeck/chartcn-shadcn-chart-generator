import type { MetadataRoute } from "next"

import { chartTypes } from "@/lib/sample-data"
import { CONTENT_UPDATED, SITE_URL } from "@/lib/seo"

export default function sitemap(): MetadataRoute.Sitemap {
  const chartPages: MetadataRoute.Sitemap = chartTypes.map((type) => ({
    url: `${SITE_URL}/charts/${type}`,
    lastModified: CONTENT_UPDATED,
    changeFrequency: "monthly",
    priority: 0.8,
  }))

  return [
    {
      url: SITE_URL,
      lastModified: CONTENT_UPDATED,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/charts`,
      lastModified: CONTENT_UPDATED,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...chartPages,
  ]
}
