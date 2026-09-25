import type { Faq } from "@/lib/faq"
import type { ChartType } from "@/types/chart"

/** Per-chart search content: each chart page targets its own keyword with
 * its own title, copy, FAQs, and related links, so the 13 pages don't
 * compete with each other or read as templated duplicates. */
export interface ChartSeo {
  /** Primary search phrase the page targets. */
  keyword: string
  /** What the chart is called in running text, e.g. "a waterfall chart". */
  noun: string
  /** <title> before the " | ChartCN" suffix; aim for ≤ 50 characters. */
  title: string
  /** Meta description, ≤ 155 characters. */
  description: string
  h1: string
  intro: string
  whenToUse: { lead: string; cases: string[] }
  /** Chart-specific data format rules, shown under the sample data. */
  dataNotes: string[]
  options: { name: string; detail: string }[]
  faqs: Faq[]
  related: ChartType[]
  imageAlt: string
}

const COMMON_DATA_NOTE =
  "Paste CSV, JSON from your API, TSV copied from Excel or Google Sheets, or a Markdown table. The generated component keeps your column names as its data keys."

export const chartSeo: Record<ChartType, ChartSeo> = {
  bar: {
    noun: "a bar chart",
    keyword: "shadcn bar chart",
    title: "Shadcn Bar Chart: Copy-Paste React Component",
    description:
      "Generate a shadcn/ui bar chart from your CSV or JSON. Grouped, stacked, or 100% stacked bars built on Recharts. Preview live and copy the TSX.",
    h1: "Shadcn Bar Chart Generator",
    intro:
      "Turn a CSV or JSON array into a shadcn/ui bar chart with rounded gradient bars, a breakdown tooltip, and grouped or stacked layouts, then copy one self-contained React component.",
    whenToUse: {
      lead: "Use a bar chart to compare values across a handful of categories or periods, where the exact height of each bar matters.",
      cases: [
        "Monthly revenue vs. expenses",
        "Signups per channel or campaign",
        "Stacked composition, e.g. revenue by plan per month",
        "100% stacked shares when proportions matter more than totals",
      ],
    },
    dataNotes: [
      "Column 1 is the category axis (months, channels, dates); every other column becomes a series of bars.",
      "Dates like 2024-01-01 get short date ticks automatically.",
    ],
    options: [
      { name: "Grouped / Stacked / 100%", detail: "Side-by-side bars, stacked totals, or each bar normalized to 100%." },
      { name: "Tooltip", detail: "A breakdown tooltip with each series' share of the bar, or shadcn's default tooltip." },
      { name: "Colors", detail: "Pick any color per series; the copied chartConfig updates to match." },
      { name: "Inline data / Data as prop", detail: "Bake your data into the component or accept it as a typed data prop." },
    ],
    faqs: [
      {
        question: "How do I make a stacked bar chart in shadcn/ui?",
        answer:
          "Choose Stacked in the Layout control. The generated code gives every <Bar> the same stackId and rounds only the top segment, so the stack reads as one bar.",
      },
      {
        question: "Does the bar chart work with data from an API?",
        answer:
          "Yes. Paste a sample of your API's JSON, switch the code to Data as prop, and pass the response straight in. The component uses your field names, so no mapping is needed.",
      },
      {
        question: "Can I change the bar colors?",
        answer:
          "Yes. Each series has a color picker, and the chartConfig in the copied code uses your colors. By default bars use your theme's --chart-1 to --chart-5 variables.",
      },
      {
        question: "What do I need installed?",
        answer:
          "The shadcn/ui chart component (npx shadcn@latest add chart), which also brings in Recharts. The generated file has no other dependencies.",
      },
    ],
    related: ["horizontal-bar", "combo", "waterfall"],
    imageAlt: "Grouped shadcn/ui bar chart comparing monthly revenue and expenses",
  },

  "horizontal-bar": {
    noun: "a horizontal bar chart",
    keyword: "shadcn horizontal bar chart",
    title: "Shadcn Horizontal Bar Chart for React",
    description:
      "Build a sorted horizontal bar chart for shadcn/ui and React. Great for rankings and long labels, with value labels. Paste data, copy the TSX.",
    h1: "Shadcn Horizontal Bar Chart",
    intro:
      "Rank categories with a horizontal bar chart: long labels stay readable, bars can be sorted high to low, and each bar carries its value at the end.",
    whenToUse: {
      lead: "Horizontal bars beat vertical ones when labels are long or when the point of the chart is the ranking.",
      cases: [
        "Top pages, products, or customers",
        "GitHub stars or downloads by library",
        "Survey answers with long option text",
        "Leaderboards that should read top to bottom",
      ],
    },
    dataNotes: [
      "Column 1 holds the labels shown down the left side; the label width adapts to your longest label.",
      "Add more columns for grouped or stacked horizontal bars.",
    ],
    options: [
      { name: "Sort", detail: "Keep your order, or sort high → low or low → high. Props-mode code sorts at render time." },
      { name: "Values", detail: "Show each bar's value at its end." },
      { name: "Grouped / Stacked / 100%", detail: "Available when you have more than one series." },
    ],
    faqs: [
      {
        question: "How do I make a horizontal bar chart with Recharts?",
        answer:
          "Set layout=\"vertical\" on BarChart, put the category on a YAxis with type=\"category\", and use a numeric XAxis. ChartCN generates exactly that, with sorting and labels wired up.",
      },
      {
        question: "Can the bars be sorted automatically?",
        answer:
          "Yes. Choose High → low or Low → high. With inline data the rows are pre-sorted; with Data as prop the component sorts incoming data itself.",
      },
      {
        question: "Why use horizontal instead of vertical bars?",
        answer:
          "Long category names don't fit under vertical bars, and rankings are easier to scan top to bottom. For time series, vertical bars are usually the better fit.",
      },
    ],
    related: ["bar", "radial", "kpi"],
    imageAlt: "Horizontal shadcn/ui bar chart ranking frameworks by GitHub stars",
  },

  line: {
    noun: "a line chart",
    keyword: "shadcn line chart",
    title: "Shadcn Line Chart: React + Recharts Component",
    description:
      "Create a shadcn/ui line chart from CSV or JSON: multi-series lines, smooth curves, dots, and date axes. Preview it live and copy the React code.",
    h1: "Shadcn Line Chart Generator",
    intro:
      "Plot trends over time with a shadcn/ui line chart: one line per series, optional smoothing and dots, and automatic date formatting on the axis.",
    whenToUse: {
      lead: "Use a line chart when the trend over an ordered axis (usually time) matters more than individual values.",
      cases: [
        "Weekly active users and sessions",
        "Response times or error rates over time",
        "Comparing a few metrics that share one scale",
      ],
    },
    dataNotes: [
      "Column 1 is the x-axis in order: dates, weeks, or any ordered label.",
      "Blank cells leave a gap in the line instead of dropping it to zero.",
    ],
    options: [
      { name: "Smooth", detail: "Monotone curves that never overshoot your data, or straight segments." },
      { name: "Dots", detail: "Show or hide a hollow dot at every data point." },
      { name: "Tooltip", detail: "Breakdown tooltip for multiple series, or shadcn's default." },
    ],
    faqs: [
      {
        question: "How do I add multiple lines to a shadcn line chart?",
        answer:
          "Add a column per line to your data. Each column becomes its own <Line> with its own color and legend entry in the generated code.",
      },
      {
        question: "What happens with missing values?",
        answer:
          "Blank cells stay blank (null), so the line shows a gap rather than a false drop to zero.",
      },
      {
        question: "Can I format the x-axis as dates?",
        answer:
          "If column 1 contains dates like 2024-01-01 or 1/5/2024, the axis and tooltip are formatted as short dates automatically.",
      },
    ],
    related: ["area", "interactive", "combo"],
    imageAlt: "Shadcn/ui line chart of weekly users and sessions",
  },

  area: {
    noun: "an area chart",
    keyword: "shadcn area chart",
    title: "Shadcn Area Chart: Stacked & Gradient React Chart",
    description:
      "Generate a shadcn/ui area chart with gradient fills, stacked or 100% modes, and date axes. Paste CSV or JSON and copy a ready React component.",
    h1: "Shadcn Area Chart Generator",
    intro:
      "Show volume over time with a shadcn/ui area chart: soft gradient fills, overlapping or stacked series, and a 100% mode for shares.",
    whenToUse: {
      lead: "Area charts emphasize magnitude over time, and stacking shows how parts add up to a total.",
      cases: [
        "Revenue by product over quarters",
        "Traffic by source, stacked to a total",
        "Share of usage by plan (100% stacked)",
      ],
    },
    dataNotes: ["Column 1 is the time axis; each other column is an area."],
    options: [
      { name: "Overlap / Stacked / 100%", detail: "Overlapping translucent areas, a stacked total, or normalized shares." },
      { name: "Tooltip", detail: "Breakdown tooltip or shadcn's default." },
      { name: "Colors", detail: "Custom color per series; gradients follow the color." },
    ],
    faqs: [
      {
        question: "How are the gradient fills made?",
        answer:
          "Each series gets an SVG linearGradient from its color at 85% opacity down to 4%. The IDs are scoped with React's useId, so two charts on one page never clash.",
      },
      {
        question: "When should I use a stacked area chart?",
        answer:
          "When the total matters as much as the parts, like traffic by source. For comparing series that don't add up, use overlapping areas or a line chart.",
      },
      {
        question: "Can I use it with live data?",
        answer:
          "Yes. Switch to Data as prop and pass rows with the same field names you pasted.",
      },
    ],
    related: ["interactive", "line", "bar"],
    imageAlt: "Stacked shadcn/ui area chart with gradient fills for three products",
  },

  combo: {
    noun: "a combo chart",
    keyword: "shadcn combo chart",
    title: "Shadcn Combo Chart: Bar and Line Together",
    description:
      "Combine bars and lines in one shadcn/ui chart, e.g. actuals vs. target. Choose bar or line per series, then copy the Recharts ComposedChart code.",
    h1: "Shadcn Combo Chart (Bar + Line)",
    intro:
      "Mix bars and lines in a single shadcn/ui chart. Pick per series whether it renders as a bar or a line, which suits actuals-vs-target and volume-vs-rate views.",
    whenToUse: {
      lead: "Combo charts put two related measures in one view without making them compete.",
      cases: [
        "Revenue (bars) vs. target (line)",
        "Orders (bars) with a moving average (line)",
        "Spend (bars) with conversions (line)",
      ],
    },
    dataNotes: ["By default the first series renders as bars and the rest as lines."],
    options: [
      { name: "Series type", detail: "Switch any series between Bar and Line." },
      { name: "Colors", detail: "Custom color per series." },
    ],
    faqs: [
      {
        question: "How do I combine a bar and a line chart in Recharts?",
        answer:
          "Use ComposedChart and place <Bar> and <Line> elements inside it. ChartCN generates the ComposedChart with the mix you choose.",
      },
      {
        question: "Can both series be lines or both bars?",
        answer: "Yes. Every series has its own Bar / Line switch.",
      },
      {
        question: "Does it support a second y-axis?",
        answer:
          "Not in the generator yet. Both series share one axis, which works best when they use similar units.",
      },
    ],
    related: ["bar", "line", "waterfall"],
    imageAlt: "Shadcn/ui combo chart with revenue bars and a target line",
  },

  pie: {
    noun: "a pie or donut chart",
    keyword: "shadcn pie chart",
    title: "Shadcn Pie Chart & Donut Chart for React",
    description:
      "Make a shadcn/ui pie or donut chart from two columns of data. Value, percent, or name labels and a donut total. Copy the React + Recharts code.",
    h1: "Shadcn Pie & Donut Chart",
    intro:
      "Show part-to-whole breakdowns with a shadcn/ui pie chart, or switch to a donut with the total in the center.",
    whenToUse: {
      lead: "Pie and donut charts work for a few categories that add up to a meaningful whole.",
      cases: [
        "Budget or headcount by team",
        "Traffic share by browser or device",
        "Plan mix across customers",
      ],
    },
    dataNotes: [
      "Use exactly 2 columns: Category,Value.",
      "Keep it to about 6 slices; group the long tail into Other.",
    ],
    options: [
      { name: "Donut", detail: "Hollow center with the total, rounded padded slices." },
      { name: "Labels", detail: "Show each slice's value, percent, or name." },
      { name: "Colors", detail: "Custom color per slice." },
    ],
    faqs: [
      {
        question: "How do I make a donut chart in shadcn/ui?",
        answer:
          "Turn on Donut. The generated Pie gets an innerRadius and a center label that shows the total, computed from your data at render time.",
      },
      {
        question: "What data does a pie chart need?",
        answer:
          "Two columns: a category and a numeric value. Blank values are left out of the chart.",
      },
      {
        question: "When should I not use a pie chart?",
        answer:
          "With many small categories or when comparing close values. A horizontal bar chart is easier to read in those cases.",
      },
    ],
    related: ["radial", "horizontal-bar", "heatmap"],
    imageAlt: "Shadcn/ui pie chart of team headcount by department",
  },

  radar: {
    noun: "a radar chart",
    keyword: "shadcn radar chart",
    title: "Shadcn Radar Chart (Spider Chart) for React",
    description:
      "Compare several metrics across series with a shadcn/ui radar chart. Paste your CSV or JSON, preview the spider chart, and copy the React component.",
    h1: "Shadcn Radar Chart Generator",
    intro:
      "Compare profiles across several dimensions with a radar (spider) chart, one translucent polygon per series.",
    whenToUse: {
      lead: "Radar charts suit comparing a few items across 4–8 dimensions on the same scale.",
      cases: [
        "Skill profiles, e.g. junior vs. senior",
        "Product feature scorecards",
        "Competitor comparisons",
      ],
    },
    dataNotes: [
      "Column 1 lists the dimensions (the spokes); each other column is a series polygon.",
      "Values should share a scale, such as 0–100.",
    ],
    options: [{ name: "Colors", detail: "Custom color per series polygon." }],
    faqs: [
      {
        question: "What is a radar chart used for?",
        answer:
          "Comparing a few items across several dimensions on one scale, like skills or feature scores. Each item becomes a polygon, so differences in shape stand out.",
      },
      {
        question: "How many series can a radar chart show?",
        answer: "Two or three read well. Beyond that, polygons overlap and a grouped bar chart is clearer.",
      },
      {
        question: "Is it built with Recharts?",
        answer: "Yes: RadarChart with PolarGrid, PolarAngleAxis, and one Radar per series, inside shadcn's ChartContainer.",
      },
    ],
    related: ["bar", "scatter", "heatmap"],
    imageAlt: "Shadcn/ui radar chart comparing junior and senior skill profiles",
  },

  scatter: {
    noun: "a scatter chart",
    keyword: "shadcn scatter chart",
    title: "Shadcn Scatter Chart: Plot X vs. Y in React",
    description:
      "Plot two numeric variables against each other with a shadcn/ui scatter chart, colored by category. Paste CSV or JSON, then copy the component.",
    h1: "Shadcn Scatter Chart Generator",
    intro:
      "Plot the relationship between two numbers with a scatter chart, with points grouped and colored by a category.",
    whenToUse: {
      lead: "Scatter charts reveal correlation, clusters, and outliers between two measures.",
      cases: [
        "Ad spend vs. conversions by channel",
        "Price vs. rating by product",
        "Latency vs. payload size by endpoint",
      ],
    },
    dataNotes: [
      "Use exactly 3 columns: Category,X,Y. The category sets each point's color and legend group.",
    ],
    options: [{ name: "Colors", detail: "Custom color per category group." }],
    faqs: [
      {
        question: "What data format does the scatter chart need?",
        answer:
          "Three columns: a category that groups points, then the X value, then the Y value. The generated component groups rows by category at render time.",
      },
      {
        question: "Are the axes labeled?",
        answer: "Yes. Your X and Y column names become the axis titles, and ticks use compact numbers like 1.5K.",
      },
      {
        question: "Can I use it for a bubble chart?",
        answer: "Not yet. A size column for bubble charts is on the roadmap.",
      },
    ],
    related: ["radar", "line", "heatmap"],
    imageAlt: "Shadcn/ui scatter chart of marketing spend vs. conversions by channel",
  },

  radial: {
    noun: "a radial chart or gauge",
    keyword: "shadcn radial chart",
    title: "Shadcn Radial Chart & Gauge for React",
    description:
      "Show progress toward goals with a shadcn/ui radial bar chart or half gauge, with the headline value in the center. Paste data and copy the code.",
    h1: "Shadcn Radial Chart & Gauge",
    intro:
      "Show progress toward a goal as concentric rings or a half gauge, with the headline metric in the center.",
    whenToUse: {
      lead: "Radial charts make a few progress percentages glanceable on a dashboard.",
      cases: [
        "Goal completion: signups, activation, retention",
        "Quota attainment per rep",
        "Storage or plan usage",
      ],
    },
    dataNotes: [
      "Use exactly 2 columns: Category,Value.",
      "Values are drawn against 0–100 (or your largest value if it's bigger), so percentages read as progress.",
    ],
    options: [
      { name: "Rings / Half gauge", detail: "Full concentric rings, or a 180° gauge." },
      { name: "Colors", detail: "Custom color per ring." },
    ],
    faqs: [
      {
        question: "How do I make a gauge chart in shadcn/ui?",
        answer:
          "Choose Half gauge. The RadialBarChart runs from 180° to 0°, with the first row's value and label in the center.",
      },
      {
        question: "What scale do the rings use?",
        answer:
          "At least 0–100, so a value of 72 fills 72% of a ring. If any value is above 100, rings scale to the largest value instead.",
      },
      {
        question: "Which value appears in the center?",
        answer: "The first row, which is also the innermost ring. Put your headline metric first.",
      },
    ],
    related: ["kpi", "pie", "horizontal-bar"],
    imageAlt: "Shadcn/ui radial chart showing signup, activation, and retention progress",
  },

  kpi: {
    noun: "a KPI card",
    keyword: "shadcn kpi card",
    title: "Shadcn KPI Card with Sparkline (React)",
    description:
      "Generate a shadcn/ui KPI stat card: headline value, change vs. the previous period, and an area, line, or bar sparkline. Paste data, copy TSX.",
    h1: "Shadcn KPI Card with Sparkline",
    intro:
      "A dashboard stat card: the latest value, its change vs. the previous period as a colored badge, and a small sparkline of the trend.",
    whenToUse: {
      lead: "KPI cards summarize one metric at a glance, usually in a row at the top of a dashboard.",
      cases: [
        "MRR, revenue, or orders this month",
        "Active users with week-over-week change",
        "Conversion rate with its recent trend",
      ],
    },
    dataNotes: [
      "Use 2 columns: Period,Value, oldest first. The last row is the headline value.",
      "The change badge compares the last two non-blank values.",
    ],
    options: [
      { name: "Sparkline", detail: "Area, line, or bar sparkline." },
      { name: "Color", detail: "Custom sparkline color." },
    ],
    faqs: [
      {
        question: "How is the percentage change calculated?",
        answer:
          "From the last two non-blank values: (latest − previous) / previous. It's computed inside the component, so it stays correct with live data.",
      },
      {
        question: "Can I put several KPI cards in a row?",
        answer:
          "Yes. The component fills its container's width, so drop several into a grid like grid-cols-1 sm:grid-cols-3.",
      },
      {
        question: "Why doesn't the sparkline start at zero?",
        answer:
          "Area and line sparklines fit the data's min to max so the trend is visible. The bar variant keeps a zero baseline.",
      },
    ],
    related: ["radial", "interactive", "line"],
    imageAlt: "Shadcn/ui KPI card showing revenue, a 7.9% increase badge, and a sparkline",
  },

  interactive: {
    noun: "an interactive area chart",
    keyword: "shadcn interactive chart",
    title: "Shadcn Interactive Area Chart with Date Range",
    description:
      "An interactive shadcn/ui area chart with 7, 30, and 90-day range buttons and a drag-to-zoom brush. Paste daily data and copy the React code.",
    h1: "Shadcn Interactive Area Chart",
    intro:
      "A stacked daily chart with range buttons (7 / 30 / 90 days / All) and a drag-to-zoom brush, the classic analytics dashboard view.",
    whenToUse: {
      lead: "Use it for daily metrics where people want both the big picture and a close look at recent days.",
      cases: [
        "Website visitors by device",
        "Daily revenue or orders",
        "API requests by region",
      ],
    },
    dataNotes: [
      "Column 1 should be dates (2024-04-01); ranges then filter by days back from your newest date.",
      "Without dates, the range buttons keep the last 7 / 30 / 90 rows instead.",
    ],
    options: [
      { name: "Default range", detail: "Which range button is selected when the chart loads." },
      { name: "Brush", detail: "Show or hide the drag-to-zoom brush under the chart." },
      { name: "Tooltip", detail: "Breakdown tooltip or shadcn's default." },
    ],
    faqs: [
      {
        question: "How does the date range filter work?",
        answer:
          "Each button keeps the rows within N days of the newest date in your data. It's plain React state in the generated component, with no date library.",
      },
      {
        question: "What is the brush?",
        answer:
          "Recharts' Brush: a small slider under the chart. Drag its handles to zoom into part of the selected range.",
      },
      {
        question: "Does it need extra shadcn components?",
        answer:
          "No. The range buttons are plain buttons styled with Tailwind, so only the shadcn chart component is required.",
      },
    ],
    related: ["area", "line", "kpi"],
    imageAlt: "Interactive shadcn/ui area chart of daily desktop and mobile visitors",
  },

  waterfall: {
    noun: "a waterfall chart",
    keyword: "react waterfall chart",
    title: "React Waterfall Chart for Shadcn UI (Recharts)",
    description:
      "Build a waterfall chart in React with shadcn/ui and Recharts: a starting total, increases, decreases, and a final total. Paste data, copy TSX.",
    h1: "Shadcn Waterfall Chart",
    intro:
      "Walk a starting value through its increases and decreases to a final total, with floating bars colored by direction.",
    whenToUse: {
      lead: "Waterfall (bridge) charts explain how you got from one number to another.",
      cases: [
        "MRR bridge: new, expansion, contraction, churn",
        "Profit and loss from revenue to net income",
        "Budget vs. actual variance",
      ],
    },
    dataNotes: [
      "Use 2 columns: Step,Change. The first row is the starting total.",
      "Every later row is a change: positive for increases, negative for decreases.",
      "A final Total bar is added for you (you can turn it off).",
    ],
    options: [
      { name: "Total bar", detail: "Append a final bar with the ending total." },
      { name: "Values", detail: "Label each bar with its signed change or total." },
      { name: "Colors", detail: "Separate colors for increases, decreases, and totals." },
    ],
    faqs: [
      {
        question: "How do you make a waterfall chart in Recharts?",
        answer:
          "Use floating bars: give each <Bar> a [low, high] range computed from the running total. ChartCN generates that calculation plus colors, labels, and a tooltip.",
      },
      {
        question: "Can the running total go negative?",
        answer:
          "Yes. Bars span the actual range, even across zero, and a zero reference line appears when needed.",
      },
      {
        question: "Does it work with data from my API?",
        answer:
          "Yes. The steps are computed inside the component, so with Data as prop you pass raw Step/Change rows and it builds the waterfall itself.",
      },
    ],
    related: ["bar", "combo", "kpi"],
    imageAlt: "Waterfall chart bridging starting MRR through new business, expansion, contraction, and churn",
  },

  heatmap: {
    noun: "a heatmap",
    keyword: "react heatmap",
    title: "React Heatmap for Shadcn UI: Cohort Grid",
    description:
      "Build a React heatmap for shadcn/ui: cohort retention, activity by day and hour, any value grid. No chart library needed. Paste data, copy TSX.",
    h1: "Shadcn Heatmap Generator",
    intro:
      "Shade a grid of values by intensity, which suits cohort retention tables and activity-by-hour grids. It's built from Tailwind and CSS, with no chart library.",
    whenToUse: {
      lead: "Heatmaps show patterns across two dimensions at once.",
      cases: [
        "Weekly cohort retention (triangle tables)",
        "Activity by weekday and hour",
        "Correlation or comparison matrices",
      ],
    },
    dataNotes: [
      "Column 1 labels the rows; every other column is a column of the grid.",
      "Blank cells stay empty, which suits cohort triangles.",
      "Choose Percent to show 0–1 values, or values that are already percentages, with a % sign.",
    ],
    options: [
      { name: "Values", detail: "Show numbers, percentages, or hide the labels." },
      { name: "Heat color", detail: "The color cells blend toward at the maximum." },
    ],
    faqs: [
      {
        question: "Does the heatmap need Recharts?",
        answer:
          "No. It's a CSS grid of cells shaded with color-mix(), so the copied component has no dependencies beyond React and Tailwind.",
      },
      {
        question: "How do I make a cohort retention chart?",
        answer:
          "Put cohorts in column 1 and Week 0, Week 1, … as the other columns, leaving future weeks blank. Choose Percent to show the values as percentages.",
      },
      {
        question: "Is the heatmap accessible?",
        answer:
          "Cells use table roles with row and column headers, and each cell has a title with its row, column, and value.",
      },
    ],
    related: ["radar", "pie", "interactive"],
    imageAlt: "Heatmap of weekly cohort retention shaded by percentage",
  },
}

export { COMMON_DATA_NOTE }
