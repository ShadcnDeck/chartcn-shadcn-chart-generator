/** Visual constants shared by the live preview components and the code
 * generator, so both render the same chart. */

/** Bars/areas after the first start animating slightly later, so multi-series
 * charts build up series by series instead of all at once. */
export const SERIES_STAGGER_MS = 120

/** Corner radius for the i-th bar series. Unstacked bars are rounded on their
 * free end and flat on the baseline; in a stack only the outermost segment is
 * rounded, so inner segments meet without gaps. */
export function barRadius(
  index: number,
  seriesCount: number,
  stacked: boolean,
  horizontal: boolean
): [number, number, number, number] {
  if (stacked && index !== seriesCount - 1) return [0, 0, 0, 0]
  const r = stacked ? 4 : 6
  return horizontal ? [0, r, r, 0] : [r, r, 0, 0]
}

/** Y-axis width that fits the longest category label (~7px per character). */
export function horizontalLabelWidth(labels: string[]): number {
  const longest = labels.reduce((max, label) => Math.max(max, label.length), 0)
  return Math.min(160, Math.max(48, Math.round(longest * 7 + 12)))
}

/** Combo series render as bars unless overridden; by default the first
 * series is a bar and the rest are lines. Keyed by internal series key. */
export function comboRenderType(
  internalKey: string,
  index: number,
  overrides?: Record<string, "bar" | "line">
): "bar" | "line" {
  return overrides?.[internalKey] ?? (index === 0 ? "bar" : "line")
}
