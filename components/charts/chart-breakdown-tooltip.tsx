"use client"

import type { ChartConfig } from "@/components/ui/chart"
import { formatCompactNumber } from "@/lib/chart-data"

interface ChartBreakdownTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ dataKey?: unknown; value?: unknown }>
  label?: string | number
  labelFormatter?: (label: unknown) => string
  config: ChartConfig
}

/** Tooltip for multi-series bar/line/area charts: shows the row's total plus
 * a small donut breaking down each series' share of that row.
 *
 * Keep in sync with BREAKDOWN_TOOLTIP in lib/code-templates.ts — the copied
 * code embeds the same component so it matches this preview. */
export function ChartBreakdownTooltip({
  active,
  payload,
  label,
  labelFormatter,
  config,
}: ChartBreakdownTooltipProps) {
  if (!active || !payload?.length) return null

  const entries = payload
    .map((item) => {
      const key = String(item.dataKey)
      const value = Math.abs(Number(item.value))
      return {
        key,
        label: config[key]?.label ?? key,
        color: config[key]?.color ?? "var(--chart-1)",
        value: Number.isFinite(value) ? value : 0,
      }
    })
    .filter((entry) => entry.value > 0)
  if (entries.length === 0) return null

  const total = entries.reduce((sum, entry) => sum + entry.value, 0)
  const stops = entries.map((entry, index) => {
    const before = entries.slice(0, index).reduce((sum, e) => sum + e.value, 0)
    return `${entry.color} ${(before / total) * 100}% ${((before + entry.value) / total) * 100}%`
  })

  return (
    <div className="min-w-52 rounded-xl border border-border bg-card p-3 text-xs shadow-lg animate-in fade-in-0 zoom-in-95 duration-150">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-medium text-foreground">
          {label !== undefined && labelFormatter ? labelFormatter(label) : label}
        </span>
        <span className="font-mono font-semibold text-foreground">
          {formatCompactNumber(total)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="relative size-14 shrink-0 rounded-full"
          style={{ background: `conic-gradient(${stops.join(", ")})` }}
        >
          <div className="absolute inset-1.5 rounded-full bg-card" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          {entries.map((entry) => (
            <div key={entry.key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="truncate">{entry.label}</span>
              </span>
              <span className="shrink-0 font-medium text-foreground">
                {Math.round((entry.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
