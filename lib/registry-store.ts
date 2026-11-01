import { del, get, list, put } from "@vercel/blob"

import { parseShareConfig, type ShareConfig } from "@/lib/share"

/** Every install chart lives under this prefix in the Blob store, and the
 * nightly purge deletes everything under it. */
const PREFIX = "registry/"

const pathFor = (id: string) => `${PREFIX}${id}.json`

export async function saveRegistryChart(id: string, config: ShareConfig): Promise<void> {
  await put(pathFor(id), JSON.stringify(config), {
    access: "private",
    contentType: "application/json",
    // Ids are content hashes, so an existing blob already holds this exact chart.
    allowOverwrite: true,
  })
}

/** Returns null when the chart was never saved or has been purged. */
export async function loadRegistryChart(id: string): Promise<ShareConfig | null> {
  // useCache: false so a purged chart stops resolving right away instead of
  // lingering in the Blob CDN cache.
  const result = await get(pathFor(id), { access: "private", useCache: false })
  if (!result || result.statusCode !== 200) return null
  try {
    return parseShareConfig(JSON.parse(await new Response(result.stream).text()))
  } catch {
    return null
  }
}

/** Deletes every saved install chart. Returns how many were removed. */
export async function purgeRegistryCharts(): Promise<number> {
  let deleted = 0
  let cursor: string | undefined
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000 })
    if (page.blobs.length > 0) {
      await del(page.blobs.map((blob) => blob.url))
      deleted += page.blobs.length
    }
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  return deleted
}
