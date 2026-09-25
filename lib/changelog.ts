import type { StaticImageData } from "next/image"

import v010 from "@/public/changelog/v0.1.0.webp"
import v020 from "@/public/changelog/v0.2.0.webp"
import v030 from "@/public/changelog/v0.3.0.webp"
import v040 from "@/public/changelog/v0.4.0.webp"
import v050 from "@/public/changelog/v0.5.0.webp"

export type ChangeKind = "added" | "changed" | "fixed" | "removed"

export type Release = {
  version: string
  date: string
  title: string
  /** One or two sentences shown under the title. */
  description: string
  /** 1600x900 (16:9) screenshot in public/changelog/, named after the version. */
  image: StaticImageData
  /** Full list, shown under "Read more". Wrap code in `backticks`. */
  changes: { kind: ChangeKind; text: string }[]
  /** One sentence: what a developer must do when re-copying a component from this version. */
  upgradeNotes?: string
}

export const repoUrl = "https://github.com/ShadcnDeck/chartcn-shadcn-chart-generator"

// Newest first. The first entry is the current version shown in the site header.
// Keep in sync with CHANGELOG.md and the version in package.json.
export const releases: Release[] = [
  {
    version: "0.5.0",
    date: "2026-09-25",
    title: "Five new charts and JSON input",
    description:
      "Waterfall, Heatmap, Interactive Area, Horizontal Bar and KPI Sparkline bring Chartcn to 13 chart types. You can now paste JSON, TSV or Markdown tables, and export any chart as PNG or SVG.",
    image: v050,
    changes: [
      { kind: "added", text: "Interactive Area, Waterfall, Heatmap, Horizontal Bar and KPI Sparkline charts." },
      { kind: "added", text: "Paste JSON, TSV or Markdown tables, not just CSV." },
      { kind: "added", text: "PNG/SVG export and an `/api/chart` image endpoint." },
      { kind: "changed", text: "Generated code uses your own column names as data keys." },
      { kind: "changed", text: "Per-chart SEO pages with Open Graph images." },
      { kind: "fixed", text: "Horizontal scroll on phones." },
    ],
    upgradeNotes: "Data keys now match your column names. Re-copy and update them.",
  },
  {
    version: "0.4.0",
    date: "2026-09-15",
    title: "A new look for Chartcn",
    description:
      "Chartcn gets its own logo, footer and FAQ. CSV numbers in any format, like 1,234.5 or 1,03,920, now parse correctly.",
    image: v040,
    changes: [
      { kind: "added", text: "ChartCN logo, footer, FAQ and share banner." },
      { kind: "fixed", text: "Numbers like `1,234.5`, `1.234,5` and `1,03,920` now parse correctly." },
      { kind: "fixed", text: "Blank cells leave a gap instead of dropping to zero." },
    ],
  },
  {
    version: "0.3.0",
    date: "2026-08-13",
    title: "Combo charts and share links",
    description:
      "Mix bars and lines in one chart, pick your own colors, and share any chart with a link. Components can now take their data as a prop.",
    image: v030,
    changes: [
      { kind: "added", text: "Export with inline data or a `data` prop." },
      { kind: "added", text: "Combo, Scatter and Radial charts, plus 100% stacking." },
      { kind: "added", text: "Custom colors, share links and saved charts." },
      { kind: "fixed", text: "Pie, Radial and Scatter code failed to type-check." },
    ],
  },
  {
    version: "0.2.0",
    date: "2026-07-22",
    title: "Colorful redesign",
    description:
      "A new color palette, dark mode and dashboard-style charts with stat cards and a growth gauge.",
    image: v020,
    changes: [
      { kind: "added", text: "Dark mode, stat cards and a growth gauge." },
      { kind: "changed", text: "New color palette and restyled charts." },
    ],
    upgradeNotes: "Re-copy components to get the new styling.",
  },
  {
    version: "0.1.0",
    date: "2026-07-21",
    title: "First release",
    description:
      "Paste a CSV, preview it as a Bar, Line, Area, Pie or Radar chart, and copy a ready-to-use shadcn/ui component.",
    image: v010,
    changes: [
      { kind: "added", text: "Bar, Line, Area, Pie and Radar charts." },
      { kind: "added", text: "Paste or upload CSV, copy the component." },
    ],
  },
]

export const currentVersion = releases[0].version

/** GitHub diff between this release and the one before it (or the tag itself for the first release). */
export function compareUrl(index: number) {
  const release = releases[index]
  const previous = releases[index + 1]
  return previous
    ? `${repoUrl}/compare/v${previous.version}...v${release.version}`
    : `${repoUrl}/releases/tag/v${release.version}`
}
