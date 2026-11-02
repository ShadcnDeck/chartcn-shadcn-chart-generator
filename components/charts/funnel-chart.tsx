"use client"

import { useState, type CSSProperties } from "react"

import {
  computeFunnel,
  formatRate,
  funnelStageColor,
  type FunnelStage,
} from "@/lib/chart-models"
import { cn } from "@/lib/utils"
import type { ChartOptions, ParsedChartData } from "@/types/chart"

interface FunnelChartProps {
  data: ParsedChartData
  options?: ChartOptions
}

/** Stage rows on one shared grid: name | shape | value and conversion. The
 * shapes are HTML, so labels never have to squeeze inside the narrow bottom
 * stages. "funnel" clips each row into a trapezoid that narrows to the next
 * stage's width; "bars" centers a bar on a muted track. */
export function FunnelChart({ data, options }: FunnelChartProps) {
  const [active, setActive] = useState<number | null>(null)
  const stages = computeFunnel(data)
  const shape = options?.funnelShape ?? "funnel"
  const rate = options?.funnelRate ?? "previous"
  const showDropoff = options?.showDropoff ?? true
  const valueLabel = data.headers[1] ?? "Value"

  if (stages.length === 0 || stages.every((stage) => stage.value === 0)) {
    return (
      <div className="flex min-h-[200px] w-full items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No stage values to chart yet
      </div>
    )
  }

  const overall = stages.length > 1 ? stages[stages.length - 1].fromFirst : null

  return (
    <div className="flex w-full flex-col gap-3 py-2">
      <ol
        aria-label={`${valueLabel} by funnel stage`}
        className="grid grid-cols-[fit-content(6rem)_minmax(0,1fr)_auto] gap-x-3 gap-y-1 sm:grid-cols-[fit-content(9rem)_minmax(0,1fr)_auto]"
        onMouseLeave={() => setActive(null)}
      >
        {stages.map((stage, index) => {
          const conversion = conversionOf(stage, index, rate)
          const dropoff = showDropoff ? dropoffOf(stage) : null
          return (
            <li
              key={`${stage.label}-${index}`}
              tabIndex={0}
              aria-label={`${stage.label}: ${stage.value.toLocaleString("en-US")} ${valueLabel}${
                conversion === null ? "" : `, ${formatRate(conversion)} of ${rate} stage`
              }`}
              className={cn(
                "col-span-3 grid grid-cols-subgrid items-center rounded-md outline-none transition-opacity duration-200 focus-visible:ring-2 focus-visible:ring-ring/50",
                active !== null && active !== index && "opacity-40"
              )}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
            >
              <span
                className={cn(
                  "text-sm leading-tight font-medium break-words text-muted-foreground transition-colors",
                  active === index && "text-foreground"
                )}
              >
                {stage.label}
              </span>
              <div className="relative">
                <StageShape
                  shape={shape}
                  stage={stage}
                  next={stages[index + 1]}
                  color={funnelStageColor(stage, index, stages.length, options)}
                  index={index}
                />
                {active === index && (
                  <FunnelTooltip stage={stage} index={index} valueLabel={valueLabel} />
                )}
              </div>
              <div className="flex flex-col items-end leading-tight tabular-nums">
                <span className="text-sm font-medium text-foreground">
                  {stage.value.toLocaleString("en-US")}
                </span>
                <span className="flex flex-col items-end text-xs text-muted-foreground sm:flex-row sm:gap-1.5">
                  {conversion === null ? "–" : formatRate(conversion)}
                  {dropoff}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>% of {rate} stage</span>
        {overall !== null && (
          <span>
            Overall conversion{" "}
            <span className="font-medium text-foreground tabular-nums">{formatRate(overall)}</span>
          </span>
        )}
      </div>
    </div>
  )
}

/** The rate shown beside a stage. The first stage is always 100%. */
function conversionOf(stage: FunnelStage, index: number, rate: "previous" | "first") {
  if (index === 0) return 1
  return rate === "first" ? stage.fromFirst : stage.fromPrevious
}

/** "−37.5%" for a drop, "+12%" when a stage grew, nothing when flat. Uses
 * the -700/-400 shades so the small text keeps 4.5:1 contrast. */
function dropoffOf(stage: FunnelStage) {
  if (stage.fromPrevious === null || stage.fromPrevious === 1) return null
  const change = stage.fromPrevious - 1
  return (
    <span className={change < 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}>
      {change < 0 ? "−" : "+"}
      {formatRate(Math.abs(change))}
    </span>
  )
}

function StageShape({
  shape,
  stage,
  next,
  color,
  index,
}: {
  shape: "funnel" | "bars"
  stage: FunnelStage
  next?: FunnelStage
  color: string
  index: number
}) {
  // Even a zero stage keeps a sliver, so it stays visible and hoverable.
  const width = (share: number) => Math.max(share, 0.02) * 100
  const enter: CSSProperties = { animationDelay: `${index * 70}ms`, animationFillMode: "both" }
  const animation = "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"

  if (shape === "bars") {
    return (
      <div className="flex h-11 justify-center rounded-lg bg-muted">
        <div
          className={cn("h-full rounded-lg", animation)}
          style={{ ...enter, width: `${width(stage.share)}%`, backgroundColor: color }}
        />
      </div>
    )
  }

  // Top edge at this stage's width, bottom edge at the next stage's, so the
  // rows read as one continuous funnel. The last stage ends square.
  const top = width(stage.share) / 2
  const bottom = width(next?.share ?? stage.share) / 2
  return (
    <div
      className={cn("h-11 w-full", animation)}
      style={{
        ...enter,
        backgroundColor: color,
        clipPath: `polygon(${50 - top}% 0, ${50 + top}% 0, ${50 + bottom}% 100%, ${50 - bottom}% 100%)`,
      }}
    />
  )
}

function FunnelTooltip({
  stage,
  index,
  valueLabel,
}: {
  stage: FunnelStage
  index: number
  valueLabel: string
}) {
  const rows: [string, string][] = [[valueLabel, stage.value.toLocaleString("en-US")]]
  if (index > 0) {
    if (stage.fromPrevious !== null) rows.push(["From previous", formatRate(stage.fromPrevious)])
    if (stage.fromFirst !== null) rows.push(["From first", formatRate(stage.fromFirst)])
    if (stage.lost !== null) {
      rows.push([stage.lost >= 0 ? "Dropped off" : "Gained", Math.abs(stage.lost).toLocaleString("en-US")])
    }
  }
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-full left-1/2 z-20 mt-1.5 grid min-w-40 -translate-x-1/2 gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs shadow-xl"
    >
      <span className="font-medium text-foreground">{stage.label}</span>
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-mono font-medium text-foreground tabular-nums">{value}</span>
        </div>
      ))}
    </div>
  )
}
