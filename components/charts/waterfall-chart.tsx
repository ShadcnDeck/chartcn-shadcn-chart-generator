"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Rectangle,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatCompactNumber } from "@/lib/chart-data"
import {
  WATERFALL_KINDS,
  computeWaterfall,
  waterfallColor,
  type WaterfallStep,
} from "@/lib/chart-models"
import type { ChartOptions, ParsedChartData } from "@/types/chart"

interface WaterfallChartProps {
  data: ParsedChartData
  options?: ChartOptions
}

export function WaterfallChart({ data, options }: WaterfallChartProps) {
  const steps = computeWaterfall(data, options?.showTotal ?? true)
  const showValues = options?.showValues ?? true
  const chartConfig: ChartConfig = Object.fromEntries(
    WATERFALL_KINDS.map(({ key, label }) => [
      key,
      { label, color: waterfallColor(key, options?.customColors) },
    ])
  )
  const hasNegative = steps.some((step) => step.range[0] < 0)

  return (
    <div className="flex w-full flex-col gap-2">
      <ChartContainer config={chartConfig} className="aspect-auto h-[330px] w-full">
        <BarChart accessibilityLayer data={steps} barCategoryGap="24%" margin={{ top: 20 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 5" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={44}
            tickFormatter={formatCompactNumber}
          />
          {hasNegative && <ReferenceLine y={0} stroke="var(--border)" />}
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={<WaterfallTooltip config={chartConfig} />}
          />
          <Bar
            dataKey="range"
            fill="var(--chart-1)"
            radius={4}
            maxBarSize={56}
            shape={(props) => (
              <Rectangle
                {...props}
                fill={chartConfig[(props.payload as WaterfallStep).kind]?.color}
              />
            )}
          >
            {showValues && (
              <LabelList
                dataKey="display"
                position="top"
                offset={6}
                className="fill-foreground"
                fontSize={12}
              />
            )}
          </Bar>
        </BarChart>
      </ChartContainer>
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        {WATERFALL_KINDS.map(({ key, label }) => (
          <span key={key} className="flex items-center gap-1.5">
            <span
              className="size-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: chartConfig[key]?.color }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

function WaterfallTooltip({
  active,
  payload,
  config,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
  config: ChartConfig
}) {
  const step = payload?.[0]?.payload as WaterfallStep | undefined
  if (!active || !step) return null
  return (
    <div className="grid min-w-36 gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <span className="font-medium text-foreground">{step.label}</span>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span
            className="size-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: config[step.kind]?.color }}
          />
          {step.kind === "total" ? "Total" : "Change"}
        </span>
        <span className="font-mono font-medium text-foreground tabular-nums">
          {step.kind === "total"
            ? step.change.toLocaleString("en-US")
            : `${step.change > 0 ? "+" : ""}${step.change.toLocaleString("en-US")}`}
        </span>
      </div>
      {step.kind !== "total" && (
        <div className="flex items-center justify-between gap-4 text-muted-foreground">
          <span>Running total</span>
          <span className="font-mono tabular-nums">{step.end.toLocaleString("en-US")}</span>
        </div>
      )}
    </div>
  )
}
