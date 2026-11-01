import { purgeRegistryCharts } from "@/lib/registry-store"

/** GET /api/cron/purge-registry - deletes every saved install chart.
 *
 * Vercel Cron calls this daily at 18:30 UTC (00:00 IST, see vercel.json) and
 * sends `Authorization: Bearer $CRON_SECRET`, so nobody else can trigger it. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const deleted = await purgeRegistryCharts()
  return Response.json({ deleted })
}
