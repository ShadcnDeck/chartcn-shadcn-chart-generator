import { MAX_REGISTRY_BYTES, parseRegistryUpload, registryIdFor } from "@/lib/registry"
import { saveRegistryChart } from "@/lib/registry-store"

/** POST /api/registry  body: {"type", "csv", "options"}
 *
 * Saves a chart so `npx shadcn add <origin>/chartcn/r/<id>.json` can install
 * it. Saved charts are purged nightly at 00:00 IST (see vercel.json). */
export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0)
  if (declaredLength > MAX_REGISTRY_BYTES) {
    return Response.json({ error: "Chart data is too large to install." }, { status: 413 })
  }

  const config = parseRegistryUpload(await request.text())
  if (!config) {
    return Response.json({ error: "Invalid chart." }, { status: 400 })
  }

  const id = await registryIdFor(config)
  try {
    await saveRegistryChart(id, config)
  } catch (error) {
    console.error("Failed to save registry chart", error)
    return Response.json({ error: "Could not save the chart. Try again." }, { status: 500 })
  }

  return Response.json({ id })
}
