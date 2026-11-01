import { buildRegistryItem, REGISTRY_ID_PATTERN } from "@/lib/registry"
import { loadRegistryChart } from "@/lib/registry-store"

const EXPIRED_MESSAGE =
  "This ChartCN install command has expired (saved charts are cleared nightly at 12:00 AM IST). Open your chart in ChartCN and generate a new command."

/** GET /r/<id>.json - the registry item the shadcn CLI fetches. Not cached:
 * charts are deleted every night, and a CDN copy would outlive the purge. */
export async function GET(_request: Request, ctx: RouteContext<"/r/[file]">) {
  const { file } = await ctx.params
  const id = file.replace(/\.json$/, "")
  if (!file.endsWith(".json") || !REGISTRY_ID_PATTERN.test(id)) {
    return Response.json({ error: "Not found." }, { status: 404 })
  }

  const config = await loadRegistryChart(id)
  if (!config) {
    return Response.json({ error: EXPIRED_MESSAGE }, { status: 404 })
  }

  return Response.json(buildRegistryItem(id, config), {
    headers: { "Cache-Control": "no-store" },
  })
}
