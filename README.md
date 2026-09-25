# ChartCN — Free Open Source Shadcn/UI Chart Generator

<img width="1920" height="1080" alt="Chartcn - Open Source Shadcn Chart" src="https://github.com/user-attachments/assets/16029aa9-890e-4886-b1c1-7a5a0a407ec3" />


**ChartCN** is a free, open source data-to-chart generator for [shadcn/ui](https://ui.shadcn.com) and React. Paste a CSV or a JSON API response, preview 13 chart types built on [Recharts](https://recharts.org), then copy a self-contained TSX component into your project. No install, no account, no new npm dependency beyond shadcn/ui and Recharts.

🔗 **Live app:** [shadcndeck.com/chartcn](https://shadcndeck.com/chartcn)

---

## Table of contents

- [Why ChartCN](#why-chartcn)
- [Features](#features)
- [Chart types](#chart-types)
- [Getting started](#getting-started)
- [Data formats](#data-formats)
- [Export modes](#export-modes)
- [Images for READMEs and docs](#images-for-readmes-and-docs)
- [Sharing and saving](#sharing-and-saving)
- [Tech stack](#tech-stack)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

---

## Why ChartCN

Most chart libraries hand you a black box: a new dependency with its own design system that never quite matches your app. ChartCN skips that trade-off. Paste a CSV or JSON, pick from 13 chart types, and copy a self-contained TSX component built on shadcn/ui and Recharts — the same primitives most shadcn/ui projects already use. Nothing to install, no account to create, and the code is yours to edit the moment you paste it.

If you're not a developer: a "chart component" is a small piece of code that draws a chart and matches the look of the app around it. ChartCN builds that piece of code from a CSV — the same file format Excel, Google Sheets, or a database export already produces. Hand it to a developer on your team and it drops into the product in minutes, with no redesign required.

## Features

- **13 chart types built in** — Bar, Horizontal Bar, Line, Area, Combo (bar + line), Pie/Donut, Radar, Scatter, Radial/Gauge, KPI Sparkline cards, Interactive Area (range buttons + zoom), Waterfall, and Heatmap
- **Paste any tabular data** — CSV, JSON (arrays of objects, `{ data: [...] }` wrappers, and more), TSV copied from Excel or Google Sheets, or a Markdown table. The format is detected automatically; upload a file or edit the table directly
- **Your field names in the code** — the generated component uses your real column / JSON keys (`{ month: "Jan", revenue: 42000 }`), so it accepts your API response without mapping code
- **Variant toggles per chart** — stacked or grouped bars, 100% stacking, smooth lines, donut style, and more
- **Automatic date axes** — a date-like category column (`2024-01-01`, `1/5/2024`, ...) gets formatted date ticks automatically
- **Custom colors** — customize series and category colors and see the change reflected live in the copied code
- **Two export modes** — export with data baked in, or as a typed `data` prop wired up to a live API or database
- **PNG / SVG downloads and image URLs** — download the chart, or copy an image URL / README snippet that renders it on demand, in light or dark
- **Shareable links** — share a link (`?c=...`) that encodes the exact chart, data, and options
- **Saved charts** — save a chart in your browser and it's still there after a refresh
- **One-click copy** — copy one self-contained TSX component, no new dependency beyond shadcn/ui and Recharts

## Chart types

| Chart | Use case |
| --- | --- |
| Bar | Compare values across categories, stacked or grouped |
| Line | Trends over time or ordered categories |
| Area | Trends with emphasis on volume/magnitude |
| Combo | Bar + line together, e.g. revenue and growth rate |
| Pie / Donut | Part-to-whole breakdowns |
| Radar | Multi-metric comparison across a category |
| Scatter | Relationship between two numeric variables |
| Radial / Gauge | Progress toward a goal per category, as rings or a half gauge |
| Horizontal Bar | Rankings and long category labels, sortable, with value labels |
| KPI Sparkline | A headline metric, its change vs. the previous period, and a trend sparkline |
| Interactive Area | Daily time series with 7 / 30 / 90-day range buttons and a drag-to-zoom brush |
| Waterfall | Walk a starting value through increases and decreases to a total (MRR bridges, P&L) |
| Heatmap | A value grid shaded by intensity: cohort retention, activity by day and hour |

## Getting started

Clone the repo and run it locally:

```bash
git clone https://github.com/ShadcnDeck/chartcn-shadcn-chart-generator.git
cd chartcn-shadcn-chart-generator
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- `/` — landing page with a live demo
- `/charts` — gallery of all 13 chart types
- `/charts/[type]` — paste/upload/edit data, tweak variants, customize colors, copy the component
- `/api/chart?c=...` — the chart as a static SVG image (see [Images](#images-for-readmes-and-docs))

To use ChartCN in your own shadcn/ui project, you just need the chart primitive and Recharts:

```bash
npx shadcn@latest add chart
npm install recharts
```

Then paste your data into the generator, copy the generated component, and drop it into your app.

## Data formats

Paste any of these; the format is detected automatically.

**CSV / TSV / Markdown table.** Column 1 is the category/label axis; every column after it is a numeric data series. TSV is what you get when you copy cells out of Excel or Google Sheets.

```csv
Month,Revenue,Expenses
Jan,42000,31000
Feb,58000,34000
```

**JSON.** An array of objects, then pick the X field and the series fields. Also accepted: rows under a wrapper key (`{ "data": [...] }`), a header row plus value rows (`[["month","revenue"],["Jan",1]]`), and a flat `{ "label": number }` map.

```json
[
  { "month": "Jan", "revenue": 42000, "expenses": 31000 },
  { "month": "Feb", "revenue": 58000, "expenses": 34000 }
]
```

- **Pie/Donut**, **Radial/Gauge**, and **KPI Sparkline** charts expect exactly 2 columns: `Category,Value` (for KPI: `Period,Value`).
- **Waterfall** charts expect 2 columns, `Step,Change`: the first row is the starting total and every later row is a change (negative for decreases). A final total bar is added for you.
- **Heatmap** data is a grid: column 1 labels the rows, every other column is a grid column. Blank cells stay empty, which suits cohort triangles.
- **Interactive Area** filters by date when column 1 holds dates; otherwise the range buttons keep the last 7 / 30 / 90 rows.
- **Scatter** charts expect exactly 3 columns: `Category,X,Y` — the category groups points into a legend/color series, X and Y are the two numeric axes.
- If column 1 looks like a date (`2024-01-01` or `1/5/2024`), Bar/Line/Area/Combo charts automatically format the axis and tooltip as dates.
- Numbers with US (`1,234.5`), European (`1.234,5`), and Indian (`1,03,920`) separators are all understood; blank cells stay blank instead of becoming 0.

## Export modes

Toggle "Inline data" vs. "Data as prop" above the code block:

- **Inline data** (default) — the component has your data baked in as a module-level const, ready to paste and run as-is.
- **Data as prop** — the component takes `data` as a prop (`export function Chart({ data }: ChartProps)`), for wiring up to live or fetched data instead of a static snapshot. It also exports a `ChartRow` type.

Either way, the generated code keys data by **your own column names**. Paste `[{ "month": "Jan", "revenue": 42000 }]` and the component reads `month` and `revenue`, so an API response drops straight in. Keys with spaces are quoted (`"Total Sales"`); the only renaming is for keys containing `.` or `[`, which Recharts would read as nested paths (`v1.2` becomes `v1_2`).

## Images for READMEs and docs

Below the preview:

- **PNG / SVG** — download exactly what the preview shows (PNG at 2x).
- **Image URL** — a URL like `https://shadcndeck.com/chartcn/api/chart?c=...` that renders the chart as an SVG. The whole chart is encoded in the URL, so nothing is stored and the image never changes.
- **README snippet** — a `<picture>` element that shows a light or dark chart to match the reader's GitHub theme.

`/api/chart` query params: `c` (required, the share payload), `theme=light|dark`, `w` / `h` (size in px, 240–2000), `title`, and `bg=transparent`. The server-side renderer is dependency-free and draws the same chart types and styling; it isn't pixel-identical to the live Recharts preview, but the downloads are.

## Sharing and saving

- **Copy share link** encodes the current chart type, data, and options into a `?c=` URL query param — anyone who opens the link sees the same chart.
- **Save chart** stores a named copy in the browser's `localStorage` so it survives a refresh; reload it later from the "Saved charts" list.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [shadcn/ui](https://ui.shadcn.com) + [Tailwind CSS](https://tailwindcss.com)
- [Recharts](https://recharts.org)
- [Papa Parse](https://www.papaparse.com) (CSV parsing)
- [Shiki](https://shiki.style) (code highlighting)

## FAQ

**What is ChartCN?**
ChartCN is a free, open source tool that turns your CSV or JSON data into a ready-to-use chart component for shadcn/ui and React. Paste or upload a CSV, preview the chart live, and copy the generated TSX code straight into your project.

**Do I need to install a new npm package to use these charts?**
No. ChartCN generates code built on shadcn/ui's own chart primitives and Recharts, the same libraries most shadcn/ui projects already use. The copied component drops straight into your codebase without adding a new dependency.

**What chart types are supported?**
ChartCN supports 13 chart types: Bar, Horizontal Bar, Line, Area, Combo (bar and line together), Pie/Donut, Radar, Scatter, Radial/Gauge, KPI Sparkline cards, Interactive Area, Waterfall, and Heatmap. Each one comes with its own variant toggles, like stacked or grouped bars, smooth lines, or donut style.

**What format should my CSV be in?**
The first column is always the category or label axis, and every column after it is a numeric data series. Pie/Donut and Radial/Gauge charts expect exactly 2 columns (Category, Value), and Scatter charts expect exactly 3 columns (Category, X, Y). If the first column looks like a date, Bar, Line, Area, and Combo charts format the axis as dates automatically.

**Can I use live or fetched data instead of pasting a CSV?**
Yes. ChartCN offers two export modes: Inline data, where your data is baked into the component as a constant, and Data as prop, where the component accepts a `data` prop so you can wire it up to an API response or database query.

**Is ChartCN free and open source?**
Yes. ChartCN is free to use, requires no account, and is open source under the MIT license.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to get set up and submit a pull request.

## License

MIT — see [LICENSE](./LICENSE).

---

Built by [ShadcnDeck](https://shadcndeck.com) — clean shadcn templates, built to ship.
