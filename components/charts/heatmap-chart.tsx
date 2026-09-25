"use client"

import {
  computeHeatmap,
  formatHeatValue,
  heatColor,
  heatIntensity,
  heatMix,
} from "@/lib/chart-models"
import type { ChartOptions, ParsedChartData } from "@/types/chart"

interface HeatmapChartProps {
  data: ParsedChartData
  options?: ChartOptions
}

/** A CSS-grid heatmap: each cell mixes the heat color into the muted
 * background in proportion to its value. Rows come from column 1, columns
 * from the remaining headers; blank cells stay empty. */
export function HeatmapChart({ data, options }: HeatmapChartProps) {
  const grid = computeHeatmap(data)
  const color = heatColor(options?.customColors)
  const showValues = options?.showValues ?? true
  const format = options?.heatFormat ?? "number"
  const fmt = (value: number) => formatHeatValue(value, format, grid.max)

  return (
    <div className="flex w-full flex-col gap-4 py-2">
      <div className="w-full overflow-x-auto">
        <div
          role="table"
          aria-label={`${data.headers[0] ?? "Rows"} by column heatmap`}
          className="grid min-w-fit gap-1 text-xs"
          style={{
            gridTemplateColumns: `auto repeat(${grid.columnLabels.length}, minmax(2.75rem, 1fr))`,
          }}
        >
          <div role="row" className="contents">
            <div role="presentation" />
            {grid.columnLabels.map((label) => (
              <div
                key={label}
                role="columnheader"
                className="truncate px-1 pb-1 text-center font-medium text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>
          {grid.rowLabels.map((rowLabel, r) => (
            <div key={`${rowLabel}-${r}`} role="row" className="contents">
              <div
                role="rowheader"
                className="flex items-center justify-end pr-2 font-medium whitespace-nowrap text-muted-foreground"
              >
                {rowLabel}
              </div>
              {grid.cells[r].map((value, c) => {
                if (value === null) {
                  return <div key={c} role="cell" className="h-10 rounded-md bg-muted/40" />
                }
                const intensity = heatIntensity(value, grid.min, grid.max)
                return (
                  <div
                    key={c}
                    role="cell"
                    title={`${rowLabel} · ${grid.columnLabels[c]}: ${fmt(value)}`}
                    className="flex h-10 items-center justify-center rounded-md font-medium tabular-nums transition-transform duration-150 hover:z-10 hover:scale-110 hover:shadow-md motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-75"
                    style={{
                      backgroundColor: `color-mix(in oklab, ${color} ${heatMix(intensity)}%, var(--muted))`,
                      color: intensity > 0.6 ? "white" : "var(--foreground)",
                      animationDelay: `${(r + c) * 30}ms`,
                      animationFillMode: "both",
                    }}
                  >
                    {showValues ? fmt(value) : null}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground tabular-nums">
        <span>{fmt(grid.min)}</span>
        <span
          className="h-2 w-32 rounded-full"
          style={{
            background: `linear-gradient(to right, color-mix(in oklab, ${color} ${heatMix(0)}%, var(--muted)), ${color})`,
          }}
        />
        <span>{fmt(grid.max)}</span>
      </div>
    </div>
  )
}
