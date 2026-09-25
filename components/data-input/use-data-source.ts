"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import {
  defaultJsonFields,
  detectFormat,
  jsonToChartData,
  parseDelimitedText,
  parseJsonSource,
  type DataFormat,
  type JsonSource,
} from "@/lib/data-import"
import type { ParsedChartData } from "@/types/chart"

export interface JsonSelection {
  source: JsonSource
  xField: string
  yFields: string[]
}

const DEBOUNCE_MS = 300

/** Owns the raw pasted/uploaded text for the detail page: detects its format,
 * parses it (debounced while typing), and for JSON keeps the chosen X / Y
 * fields across edits. Parsed data is pushed out through `onParsed`. */
export function useDataSource(initialText: string, onParsed: (data: ParsedChartData) => void) {
  const [text, setTextState] = useState(initialText)
  const [error, setError] = useState<string | undefined>()
  const [json, setJson] = useState<JsonSelection | null>(null)
  const jsonRef = useRef<JsonSelection | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const onParsedRef = useRef(onParsed)

  useEffect(() => {
    onParsedRef.current = onParsed
  }, [onParsed])

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  const updateJson = useCallback((next: JsonSelection | null) => {
    jsonRef.current = next
    setJson(next)
  }, [])

  const emit = useCallback((parsed: ParsedChartData) => {
    setError(parsed.error)
    // Warnings (e.g. truncated rows) come with usable rows; hard errors don't.
    if (!parsed.error || parsed.rows.length > 0) onParsedRef.current(parsed)
  }, [])

  const parse = useCallback(
    (next: string) => {
      const format = detectFormat(next)
      if (format !== "json") {
        updateJson(null)
        emit(parseDelimitedText(next, format))
        return
      }

      const source = parseJsonSource(next)
      if ("error" in source) {
        updateJson(null)
        setError(source.error)
        return
      }
      // Keep the user's field picks when they're still present after an edit.
      const previous = jsonRef.current
      const defaults = defaultJsonFields(source)
      const xField =
        previous && source.fields.includes(previous.xField) ? previous.xField : defaults.xField
      const keptY =
        previous?.yFields.filter((f) => f !== xField && source.numericFields.includes(f)) ?? []
      const selection = {
        source,
        xField,
        yFields: keptY.length > 0 ? keptY : defaults.yFields.filter((f) => f !== xField),
      }
      updateJson(selection)
      emit(jsonToChartData(source, selection.xField, selection.yFields))
    },
    [emit, updateJson]
  )

  /** User edits: debounced unless `immediate` (e.g. a file upload). */
  const setText = useCallback(
    (next: string, immediate = false) => {
      setTextState(next)
      clearTimeout(debounceRef.current)
      if (immediate) parse(next)
      else debounceRef.current = setTimeout(() => parse(next), DEBOUNCE_MS)
    },
    [parse]
  )

  /** Replaces the text without re-parsing, for data that's already been
   * applied elsewhere (a share link or saved chart). */
  const replaceText = useCallback(
    (next: string) => {
      clearTimeout(debounceRef.current)
      setTextState(next)
      setError(undefined)
      updateJson(null)
    },
    [updateJson]
  )

  const selectJsonFields = useCallback(
    (xField: string, yFields: string[]) => {
      const current = jsonRef.current
      if (!current) return
      const selection = { ...current, xField, yFields: yFields.filter((f) => f !== xField) }
      updateJson(selection)
      emit(jsonToChartData(current.source, selection.xField, selection.yFields))
    },
    [emit, updateJson]
  )

  const format: DataFormat = detectFormat(text)
  return { text, format, error, json, setText, replaceText, selectJsonFields }
}
