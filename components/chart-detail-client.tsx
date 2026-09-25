"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"

import { ChartPreview } from "@/components/chart-preview"
import { ChartStats } from "@/components/charts/chart-stats"
import { GrowthGauge } from "@/components/charts/growth-gauge"
import { CodeBlock } from "@/components/code-block"
import { ColorPickerRow } from "@/components/color-picker-row"
import { CopyButton } from "@/components/copy-button"
import { DataPaste } from "@/components/data-input/data-paste"
import { EditableTable } from "@/components/data-input/editable-table"
import { FileUpload } from "@/components/data-input/file-upload"
import { useDataSource } from "@/components/data-input/use-data-source"
import { ImageExport } from "@/components/image-export"
import { ShareControls } from "@/components/share-controls"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { generateComponentCode } from "@/lib/code-templates"
import {
  CATEGORY_KEY,
  computeGrowth,
  computeKpi,
  getSeries,
  resolveColor,
  toChartRows,
  toScatterGroups,
} from "@/lib/chart-data"
import {
  HEAT_KEY,
  TIME_RANGES,
  WATERFALL_KINDS,
  heatColor,
  waterfallColor,
} from "@/lib/chart-models"
import { comboRenderType } from "@/lib/chart-style"
import { parseCSV, toCSV, validateColumnsForType } from "@/lib/csv-parser"
import { decodeShareConfig } from "@/lib/share"
import { sampleCSV, sampleJSON } from "@/lib/sample-data"
import type { ChartOptions, ChartType, ParsedChartData } from "@/types/chart"

interface ChartDetailClientProps {
  type: ChartType
}

const SERIES_TYPES = new Set<ChartType>(["bar", "horizontal-bar", "line", "area", "combo"])
const CATEGORY_COLOR_TYPES = new Set<ChartType>(["pie", "radial"])

type InputTab = "paste" | "upload" | "table"

/** Reads the `?c=` share param. useSearchParams makes this subtree render on
 * the client only, so the page passes `<ChartDetail shareParam={null} />` as
 * the Suspense fallback: the prerendered HTML (what crawlers see) still has
 * the whole tool with sample data and its generated code. */
export function ChartDetailClient({ type }: ChartDetailClientProps) {
  const shareParam = useSearchParams().get("c")
  return <ChartDetail type={type} shareParam={shareParam} />
}

export function ChartDetail({ type, shareParam }: { type: ChartType; shareParam: string | null }) {
  const previewRef = useRef<HTMLDivElement>(null)

  const [data, setData] = useState<ParsedChartData>(() => parseCSV(sampleCSV[type]))
  const [options, setOptions] = useState<ChartOptions>({})
  const [tab, setTab] = useState<InputTab>("paste")
  const source = useDataSource(sampleCSV[type], setData)
  const { replaceText } = source

  useEffect(() => {
    if (!shareParam) return
    let cancelled = false

    decodeShareConfig(shareParam).then((config) => {
      if (cancelled || !config || config.type !== type) return
      setData(parseCSV(config.csv))
      setOptions(config.options ?? {})
      // Show the loaded data in the paste box too, instead of the sample.
      replaceText(config.csv)
    })

    return () => {
      cancelled = true
    }
  }, [shareParam, type, replaceText])

  const code = useMemo(
    () => generateComponentCode(type, data, options),
    [type, data, options]
  )

  const csvText = useMemo(() => toCSV(data), [data])
  const columnWarning = useMemo(() => validateColumnsForType(type, data), [type, data])

  const colorPickerItems = useMemo(() => {
    if (CATEGORY_COLOR_TYPES.has(type)) {
      return toChartRows(data).map((row, index) => {
        const category = String(row[CATEGORY_KEY])
        return {
          key: category,
          label: category,
          color: resolveColor(category, index, options.customColors),
        }
      })
    }
    if (type === "waterfall") {
      return WATERFALL_KINDS.map(({ key, label }) => ({
        key,
        label,
        color: waterfallColor(key, options.customColors),
      }))
    }
    if (type === "heatmap") {
      return [{ key: HEAT_KEY, label: "Heat color", color: heatColor(options.customColors) }]
    }
    if (type === "scatter") {
      return toScatterGroups(data, options.customColors).map(({ key, label, color }) => ({
        key,
        label,
        color,
      }))
    }
    const series = type === "kpi" ? getSeries(data).slice(0, 1) : getSeries(data)
    return series.map((series, index) => ({
      key: series.key,
      label: series.label,
      color: resolveColor(series.key, index, options.customColors),
    }))
  }, [type, data, options.customColors])

  const kpiExport = useMemo(() => {
    if (type !== "kpi") return undefined
    const kpi = computeKpi(data)
    return {
      header: {
        label: kpi.label,
        value:
          kpi.latest === null
            ? "–"
            : kpi.latest.toLocaleString("en-US", { maximumFractionDigits: 2 }),
        badge:
          kpi.delta === null
            ? undefined
            : {
                text: `${kpi.delta >= 0 ? "▲" : "▼"} ${Math.abs(kpi.delta).toFixed(1)}%`,
                positive: kpi.delta >= 0,
              },
      },
      footer: `${kpi.firstCategory} – ${kpi.lastCategory}`,
    }
  }, [type, data])

  function handleColorChange(key: string, color: string) {
    setOptions({ ...options, customColors: { ...options.customColors, [key]: color } })
  }

  function handleResetColors() {
    setOptions({ ...options, customColors: undefined })
  }

  const showSidePanel = SERIES_TYPES.has(type)
  // First-to-last growth is meaningless for a ranking (horizontal bars).
  const growth = showSidePanel && type !== "horizontal-bar" ? computeGrowth(data) : null

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_3fr]">
      <div className="flex min-w-0 flex-col gap-4">
        <Tabs value={tab} onValueChange={(value) => setTab(value as InputTab)}>
          <TabsList className="w-full">
            <TabsTrigger value="paste">Paste data</TabsTrigger>
            <TabsTrigger value="upload">Upload file</TabsTrigger>
            <TabsTrigger value="table">Edit table</TabsTrigger>
          </TabsList>
          <TabsContent value="paste">
            <DataPaste
              value={source.text}
              format={source.format}
              error={source.error}
              json={source.json}
              onChange={(text) => source.setText(text)}
              onSelectJsonFields={source.selectJsonFields}
              onTryJson={() => source.setText(sampleJSON(type), true)}
            />
          </TabsContent>
          <TabsContent value="upload">
            <FileUpload
              onText={(text) => {
                source.setText(text, true)
                setTab("paste")
              }}
            />
          </TabsContent>
          <TabsContent value="table">
            <EditableTable data={data} onChange={setData} />
          </TabsContent>
        </Tabs>
        {columnWarning && (
          <p className="text-sm text-amber-600 dark:text-amber-500">{columnWarning}</p>
        )}
        <ShareControls type={type} csv={csvText} options={options} />
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
              <ChartVariantToggles type={type} data={data} options={options} onChange={setOptions} />
              <ControlGroup label="Code">
                <ExportModeToggle options={options} onChange={setOptions} />
              </ControlGroup>
            </div>
            <ColorPickerRow
              items={colorPickerItems}
              hasCustomColors={Boolean(
                options.customColors && Object.keys(options.customColors).length > 0
              )}
              onChange={handleColorChange}
              onReset={handleResetColors}
            />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div ref={previewRef} className="min-w-0 flex-1">
                <ChartPreview type={type} data={data} options={options} />
              </div>
              {showSidePanel && (
                <div className="flex w-full shrink-0 flex-col gap-3 sm:w-44">
                  {growth != null && (
                    <div className="flex items-center justify-center rounded-lg bg-muted/40 py-3">
                      <GrowthGauge value={growth} />
                    </div>
                  )}
                  <ChartStats data={data} customColors={options.customColors} />
                </div>
              )}
            </div>
            <div className="border-t border-border pt-4">
              <ImageExport
                previewRef={previewRef}
                type={type}
                csv={csvText}
                options={options}
                legend={colorPickerItems}
                legendBelow={type === "waterfall"}
                header={kpiExport?.header}
                footer={kpiExport?.footer}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 gap-0 overflow-hidden py-0">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
            <span className="font-mono text-xs text-muted-foreground">chart.tsx</span>
            <CopyButton getText={() => code} />
          </div>
          <CodeBlock code={code} />
        </Card>
      </div>
    </div>
  )
}

function ControlGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  )
}

/** Single-choice toggle group that never ends up with nothing selected. */
function Segmented<T extends string>({
  value,
  items,
  onChange,
}: {
  value: T
  items: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(values) => {
        const next = values[0] as T | undefined
        if (next) onChange(next)
      }}
    >
      {items.map((item) => (
        <ToggleGroupItem key={item.value} value={item.value}>
          {item.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function ExportModeToggle({
  options,
  onChange,
}: {
  options: ChartOptions
  onChange: (options: ChartOptions) => void
}) {
  return (
    <Segmented
      value={options.exportMode ?? "inline"}
      items={[
        { value: "inline", label: "Inline data" },
        { value: "props", label: "Data as prop" },
      ]}
      onChange={(exportMode) => onChange({ ...options, exportMode })}
    />
  )
}

const STACK_ITEMS: { value: NonNullable<ChartOptions["stackMode"]>; label: string }[] = [
  { value: "none", label: "Grouped" },
  { value: "stack", label: "Stacked" },
  { value: "percent", label: "100%" },
]

function ChartVariantToggles({
  type,
  data,
  options,
  onChange,
}: {
  type: ChartType
  data: ParsedChartData
  options: ChartOptions
  onChange: (options: ChartOptions) => void
}) {
  const series = getSeries(data)
  const tooltip = series.length > 1 && (
    <ControlGroup label="Tooltip">
      <Segmented
        value={options.tooltipStyle ?? "breakdown"}
        items={[
          { value: "breakdown", label: "Breakdown" },
          { value: "simple", label: "Simple" },
        ]}
        onChange={(tooltipStyle) => onChange({ ...options, tooltipStyle })}
      />
    </ControlGroup>
  )

  if (type === "bar" || type === "area") {
    return (
      <div className="flex flex-wrap items-end gap-4">
        {series.length > 1 && (
          <ControlGroup label="Layout">
            <Segmented
              value={options.stackMode ?? "none"}
              items={type === "area" ? [{ value: "none", label: "Overlap" }, ...STACK_ITEMS.slice(1)] : STACK_ITEMS}
              onChange={(stackMode) => onChange({ ...options, stackMode })}
            />
          </ControlGroup>
        )}
        {tooltip}
      </div>
    )
  }

  if (type === "horizontal-bar") {
    const stacked = (options.stackMode ?? "none") !== "none"
    return (
      <div className="flex flex-wrap items-end gap-4">
        <ControlGroup label="Sort">
          <Segmented
            value={options.sortBars ?? "none"}
            items={[
              { value: "none", label: "As is" },
              { value: "desc", label: "High → low" },
              { value: "asc", label: "Low → high" },
            ]}
            onChange={(sortBars) => onChange({ ...options, sortBars })}
          />
        </ControlGroup>
        {series.length > 1 && (
          <ControlGroup label="Layout">
            <Segmented
              value={options.stackMode ?? "none"}
              items={STACK_ITEMS}
              onChange={(stackMode) => onChange({ ...options, stackMode })}
            />
          </ControlGroup>
        )}
        {!stacked && (
          <ControlGroup label="Labels">
            <Toggle
              pressed={options.showValues ?? true}
              onPressedChange={(showValues) => onChange({ ...options, showValues })}
            >
              Values
            </Toggle>
          </ControlGroup>
        )}
        {tooltip}
      </div>
    )
  }

  if (type === "line") {
    return (
      <div className="flex flex-wrap items-end gap-4">
        <ControlGroup label="Style">
          <Toggle
            pressed={options.smooth ?? false}
            onPressedChange={(smooth) => onChange({ ...options, smooth })}
          >
            Smooth
          </Toggle>
          <Toggle
            pressed={options.showDots ?? true}
            onPressedChange={(showDots) => onChange({ ...options, showDots })}
          >
            Dots
          </Toggle>
        </ControlGroup>
        {tooltip}
      </div>
    )
  }

  if (type === "combo") {
    const renderTypes = options.seriesRenderType ?? {}
    return (
      <ControlGroup label="Series">
        <div className="flex flex-wrap items-center gap-3">
          {series.map(({ key, label }, index) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="max-w-20 truncate text-xs text-muted-foreground">{label}</span>
              <Segmented
                value={comboRenderType(key, index, renderTypes)}
                items={[
                  { value: "bar", label: "Bar" },
                  { value: "line", label: "Line" },
                ]}
                onChange={(renderAs) =>
                  onChange({ ...options, seriesRenderType: { ...renderTypes, [key]: renderAs } })
                }
              />
            </div>
          ))}
        </div>
      </ControlGroup>
    )
  }

  if (type === "pie") {
    return (
      <div className="flex flex-wrap items-end gap-4">
        <ControlGroup label="Style">
          <Toggle
            pressed={options.donut ?? false}
            onPressedChange={(donut) => onChange({ ...options, donut })}
          >
            Donut
          </Toggle>
        </ControlGroup>
        {!options.donut && (
          <ControlGroup label="Labels">
            <Segmented
              value={options.labelType ?? "value"}
              items={[
                { value: "value", label: "Value" },
                { value: "percent", label: "Percent" },
                { value: "label", label: "Name" },
              ]}
              onChange={(labelType) => onChange({ ...options, labelType })}
            />
          </ControlGroup>
        )}
      </div>
    )
  }

  if (type === "radial") {
    return (
      <ControlGroup label="Shape">
        <Segmented
          value={options.halfGauge ? "half" : "full"}
          items={[
            { value: "full", label: "Rings" },
            { value: "half", label: "Half gauge" },
          ]}
          onChange={(shape) => onChange({ ...options, halfGauge: shape === "half" })}
        />
      </ControlGroup>
    )
  }

  if (type === "interactive") {
    return (
      <div className="flex flex-wrap items-end gap-4">
        <ControlGroup label="Default range">
          <Segmented
            value={options.defaultRange ?? "90d"}
            items={TIME_RANGES.map(({ value, label }) => ({ value, label }))}
            onChange={(defaultRange) => onChange({ ...options, defaultRange })}
          />
        </ControlGroup>
        <ControlGroup label="Zoom">
          <Toggle
            pressed={options.showBrush ?? true}
            onPressedChange={(showBrush) => onChange({ ...options, showBrush })}
          >
            Brush
          </Toggle>
        </ControlGroup>
        {tooltip}
      </div>
    )
  }

  if (type === "waterfall") {
    return (
      <ControlGroup label="Show">
        <Toggle
          pressed={options.showTotal ?? true}
          onPressedChange={(showTotal) => onChange({ ...options, showTotal })}
        >
          Total bar
        </Toggle>
        <Toggle
          pressed={options.showValues ?? true}
          onPressedChange={(showValues) => onChange({ ...options, showValues })}
        >
          Values
        </Toggle>
      </ControlGroup>
    )
  }

  if (type === "heatmap") {
    return (
      <div className="flex flex-wrap items-end gap-4">
        <ControlGroup label="Values">
          <Segmented
            value={options.showValues === false ? "hidden" : (options.heatFormat ?? "number")}
            items={[
              { value: "number", label: "Number" },
              { value: "percent", label: "Percent" },
              { value: "hidden", label: "Hidden" },
            ]}
            onChange={(value) =>
              onChange(
                value === "hidden"
                  ? { ...options, showValues: false }
                  : { ...options, showValues: true, heatFormat: value }
              )
            }
          />
        </ControlGroup>
      </div>
    )
  }

  if (type === "kpi") {
    return (
      <ControlGroup label="Sparkline">
        <Segmented
          value={options.sparkType ?? "area"}
          items={[
            { value: "area", label: "Area" },
            { value: "line", label: "Line" },
            { value: "bar", label: "Bar" },
          ]}
          onChange={(sparkType) => onChange({ ...options, sparkType })}
        />
      </ControlGroup>
    )
  }

  return <div />
}
