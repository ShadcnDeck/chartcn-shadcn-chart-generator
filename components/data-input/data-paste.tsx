"use client"

import { Braces } from "lucide-react"

import type { JsonSelection } from "@/components/data-input/use-data-source"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { DATA_FORMAT_LABELS, type DataFormat } from "@/lib/data-import"

interface DataPasteProps {
  value: string
  format: DataFormat
  error?: string
  json: JsonSelection | null
  onChange: (value: string) => void
  onSelectJsonFields: (xField: string, yFields: string[]) => void
  /** Swaps in a JSON version of the sample, to show off JSON input. */
  onTryJson?: () => void
}

export function DataPaste({
  value,
  format,
  error,
  json,
  onChange,
  onSelectJsonFields,
  onTryJson,
}: DataPasteProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          CSV, TSV from Excel/Sheets, a Markdown table, or JSON.
        </p>
        {value.trim() && (
          <Badge variant="secondary" className="shrink-0 font-mono">
            {DATA_FORMAT_LABELS[format]}
          </Badge>
        )}
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'Month,Revenue\nJan,42000\n\nor [{ "month": "Jan", "revenue": 42000 }]'}
        spellCheck={false}
        className="min-h-[240px] font-mono text-sm"
      />
      {json && <JsonFieldPicker selection={json} onChange={onSelectJsonFields} />}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {onTryJson && format !== "json" && (
        <Button variant="ghost" size="xs" className="self-start" onClick={onTryJson}>
          <Braces /> Try it with JSON
        </Button>
      )}
    </div>
  )
}

function JsonFieldPicker({
  selection,
  onChange,
}: {
  selection: JsonSelection
  onChange: (xField: string, yFields: string[]) => void
}) {
  const { source, xField, yFields } = selection
  const yOptions = source.numericFields.filter((field) => field !== xField)

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/30 p-3 text-xs">
      <label className="flex items-center gap-2">
        <span className="w-14 shrink-0 font-medium text-muted-foreground">X axis</span>
        <select
          value={xField}
          onChange={(e) => onChange(e.target.value, yFields)}
          className="h-7 min-w-0 flex-1 rounded-md border border-input bg-background px-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {source.fields.map((field) => (
            <option key={field} value={field}>
              {field}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-start gap-2">
        <span className="w-14 shrink-0 pt-1.5 font-medium text-muted-foreground">Series</span>
        <div className="flex flex-wrap gap-1.5">
          {yOptions.length === 0 && (
            <span className="pt-1.5 text-muted-foreground">No numeric fields found.</span>
          )}
          {yOptions.map((field) => {
            const selected = yFields.includes(field)
            return (
              <Toggle
                key={field}
                size="sm"
                variant="outline"
                pressed={selected}
                onPressedChange={(pressed) =>
                  onChange(
                    xField,
                    pressed
                      ? yOptions.filter((f) => f === field || yFields.includes(f))
                      : yFields.filter((f) => f !== field)
                  )
                }
                className="font-mono"
              >
                {field}
              </Toggle>
            )
          })}
        </div>
      </div>
      <p className="text-muted-foreground">
        {source.records.length} records. The generated code keeps these field names, so it takes
        your API response as-is.
      </p>
    </div>
  )
}
