export type ChartType =
  | "bar"
  | "line"
  | "area"
  | "pie"
  | "radar"
  | "combo"
  | "scatter"
  | "radial"

export interface ChartDataRow {
  [key: string]: string | number | null
}

export interface ParsedChartData {
  headers: string[]
  rows: ChartDataRow[]
  error?: string
}

export interface ChartOptions {
  stackMode?: "none" | "stack" | "percent" // bar, area, combo
  smooth?: boolean // line
  showDots?: boolean // line
  donut?: boolean // pie
  labelType?: "value" | "percent" | "label" // pie
  seriesRenderType?: Record<string, "bar" | "line"> // combo
  customColors?: Record<string, string> // all types, keyed by series key or category label
  exportMode?: "inline" | "props"
}

export interface ChartConfig {
  type: ChartType
  data: ParsedChartData
  options?: ChartOptions
}
