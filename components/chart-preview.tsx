import { ChartNoAxesColumn } from "lucide-react"

import { AreaChart } from "@/components/charts/area-chart"
import { BarChart } from "@/components/charts/bar-chart"
import { ComboChart } from "@/components/charts/combo-chart"
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart"
import { KpiChart } from "@/components/charts/kpi-chart"
import { LineChart } from "@/components/charts/line-chart"
import { PieChart } from "@/components/charts/pie-chart"
import { RadarChart } from "@/components/charts/radar-chart"
import { RadialChart } from "@/components/charts/radial-chart"
import { ScatterChart } from "@/components/charts/scatter-chart"
import type { ChartOptions, ChartType, ParsedChartData } from "@/types/chart"

interface ChartPreviewProps {
  type: ChartType
  data: ParsedChartData
  options?: ChartOptions
}

export function ChartPreview({ type, data, options }: ChartPreviewProps) {
  if (data.headers.length < 2 || data.rows.length === 0) {
    return <EmptyChart />
  }

  switch (type) {
    case "bar":
      return <BarChart data={data} options={options} />
    case "horizontal-bar":
      return <HorizontalBarChart data={data} options={options} />
    case "line":
      return <LineChart data={data} options={options} />
    case "area":
      return <AreaChart data={data} options={options} />
    case "combo":
      return <ComboChart data={data} options={options} />
    case "pie":
      return <PieChart data={data} options={options} />
    case "radar":
      return <RadarChart data={data} options={options} />
    case "scatter":
      return <ScatterChart data={data} options={options} />
    case "radial":
      return <RadialChart data={data} options={options} />
    case "kpi":
      return <KpiChart data={data} options={options} />
    default: {
      const exhaustive: never = type
      throw new Error(`Unhandled chart type: ${exhaustive}`)
    }
  }
}

function EmptyChart() {
  return (
    <div className="flex h-[350px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground">
      <ChartNoAxesColumn className="size-6" />
      <p className="font-medium text-foreground">Nothing to chart yet</p>
      <p className="max-w-xs text-xs">
        Add a header row plus at least one data row: a label column followed by one or more
        numeric columns.
      </p>
    </div>
  )
}
