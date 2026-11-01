"use client"

import { useState } from "react"
import { Loader2, Terminal } from "lucide-react"

import { CopyButton } from "@/components/copy-button"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BASE_PATH } from "@/lib/seo"
import type { ChartOptions, ChartType } from "@/types/chart"

const PACKAGE_MANAGERS = {
  npm: "npx shadcn@latest add",
  pnpm: "pnpm dlx shadcn@latest add",
  yarn: "yarn shadcn@latest add",
  bun: "bunx --bun shadcn@latest add",
} as const

type PackageManager = keyof typeof PACKAGE_MANAGERS

interface InstallCommandProps {
  type: ChartType
  csv: string
  options: ChartOptions
}

/** "Get install command": saves the current chart to the registry and shows
 * the `shadcn add` command for it. Any edit to the chart changes its config,
 * so the shown command is dropped and has to be generated again. */
export function InstallCommand({ type, csv, options }: InstallCommandProps) {
  const configKey = JSON.stringify({ type, csv, options })
  const [saved, setSaved] = useState<{ key: string; url: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manager, setManager] = useState<PackageManager>("npm")

  const url = saved?.key === configKey ? saved.url : null
  const command = url ? `${PACKAGE_MANAGERS[manager]} ${url}` : ""

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${BASE_PATH}/api/registry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: configKey,
      })
      const result = (await response.json()) as { id?: string; error?: string }
      if (!response.ok || !result.id) throw new Error(result.error ?? "Could not create the command.")
      setSaved({
        key: configKey,
        url: `${window.location.origin}${BASE_PATH}/r/${result.id}.json`,
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the command.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="min-w-0 gap-3 border-primary/40 bg-primary/5 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Terminal className="size-4" /> Install with the shadcn CLI
          </span>
          <span className="text-xs text-muted-foreground">
            {saved && !url
              ? "You changed the chart. Generate a new command to install this version."
              : "One command adds this chart and its dependencies to your project."}
          </span>
        </div>
        {url ? (
          <Tabs value={manager} onValueChange={(value) => setManager(value as PackageManager)}>
            <TabsList>
              {Object.keys(PACKAGE_MANAGERS).map((key) => (
                <TabsTrigger key={key} value={key}>
                  {key}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : (
          <Button size="sm" onClick={handleGenerate} disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Generating..." : "Get install command"}
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {url && (
        <>
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-2.5">
            <code className="min-w-0 flex-1 font-mono text-xs leading-relaxed break-all">{command}</code>
            <CopyButton getText={() => command} label="Copy" size="sm" variant="outline" />
          </div>
          <p className="text-xs text-muted-foreground">
            This command works until 12:00 AM IST tonight. After that, generate a new one.
          </p>
        </>
      )}
    </Card>
  )
}
