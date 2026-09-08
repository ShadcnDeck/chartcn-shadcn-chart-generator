import type { MetadataRoute } from "next"

import { chartTypes } from "@/lib/sample-data"
import { SITE_URL } from "@/lib/seo"

export default function sitemap(): MetadataRoute.Sitemap {
  const chartPages: MetadataRoute.Sitemap = chartTypes.map((type) => ({
    url: `${SITE_URL}/charts/${type}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  }))

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/charts`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...chartPages,
  ]
}
