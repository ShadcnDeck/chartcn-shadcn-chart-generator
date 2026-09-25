import Link from "next/link"
import {
  AreaChart,
  BarChart3,
  ChartBarBig,
  ChartNoAxesCombined,
  Gauge,
  LineChart,
  PieChart,
  Radar,
  ScatterChart,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"

import { ChartPreview } from "@/components/chart-preview"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { chartTypeDescriptions, chartTypeLabels, sampleCSV } from "@/lib/sample-data"
import { parseCSV } from "@/lib/csv-parser"
import type { ChartType } from "@/types/chart"

interface ChartCardProps {
  type: ChartType
}

const chartIcons: Record<ChartType, LucideIcon> = {
  bar: BarChart3,
  "horizontal-bar": ChartBarBig,
  line: LineChart,
  area: AreaChart,
  combo: ChartNoAxesCombined,
  pie: PieChart,
  radar: Radar,
  scatter: ScatterChart,
  radial: Gauge,
  kpi: TrendingUp,
}

export function ChartCard({ type }: ChartCardProps) {
  const data = parseCSV(sampleCSV[type])
  const Icon = chartIcons[type]

  return (
    <Card className="group flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/[0.04] hover:ring-primary/30">
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="size-4" />
          </span>
          <CardTitle className="text-base">{chartTypeLabels[type]}</CardTitle>
        </div>
        <CardDescription>{chartTypeDescriptions[type]}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartPreview type={type} data={data} />
      </CardContent>
      <CardFooter>
        <Link
          href={`/charts/${type}`}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-full group-hover:border-primary/40 group-hover:text-primary"
          )}
        >
          View and copy
        </Link>
      </CardFooter>
    </Card>
  )
}
