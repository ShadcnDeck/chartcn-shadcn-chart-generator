export interface Faq {
  question: string
  answer: string
}

export const faqs: Faq[] = [
  {
    question: "What is ChartCN?",
    answer:
      "ChartCN is a free, open source tool that turns your CSV data into a ready to use chart component for shadcn/ui and React. Paste or upload a CSV, preview the chart live, and copy the generated TSX code straight into your project.",
  },
  {
    question: "Do I need to install a new npm package to use these charts?",
    answer:
      "No. ChartCN generates code built on shadcn/ui's own chart primitives and Recharts, the same libraries most shadcn/ui projects already use. The copied component drops straight into your codebase without adding a new dependency.",
  },
  {
    question: "What chart types are supported?",
    answer:
      "ChartCN supports 8 chart types: Bar, Line, Area, Combo (bar and line together), Pie/Donut, Radar, Scatter, and Radial/Gauge. Each one comes with its own variant toggles, like stacked or grouped bars, smooth lines, or donut style.",
  },
  {
    question: "What format should my CSV be in?",
    answer:
      "The first column is always the category or label axis, and every column after it is a numeric data series. Pie/Donut and Radial/Gauge charts expect exactly 2 columns (Category, Value), and Scatter charts expect exactly 3 columns (Category, X, Y). If the first column looks like a date, Bar, Line, Area, and Combo charts format the axis as dates automatically.",
  },
  {
    question: "Can I use live or fetched data instead of pasting a CSV?",
    answer:
      "Yes. ChartCN offers two export modes: Inline data, where your data is baked into the component as a constant, and Data as prop, where the component accepts a data prop so you can wire it up to an API response or database query.",
  },
  {
    question: "Is ChartCN free and open source?",
    answer:
      "Yes. ChartCN is free to use, requires no account, and is open source under the MIT license.",
  },
]
