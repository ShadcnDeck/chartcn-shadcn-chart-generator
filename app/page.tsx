import Link from "next/link";
import {
  AreaChart,
  BarChart3,
  BookmarkCheck,
  CalendarClock,
  Copy,
  FileCode2,
  LayoutGrid,
  LineChart,
  Palette,
  PieChart,
  Radar,
  Share2,
  SlidersHorizontal,
  Table2,
} from "lucide-react";

import { ChartPreview } from "@/components/chart-preview";
import { CopyButton } from "@/components/copy-button";
import { InteractiveGrid } from "@/components/interactive-grid";
import { Reveal } from "@/components/reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { parseCSV } from "@/lib/csv-parser";
import { faqs } from "@/lib/faq";
import { sampleCSV } from "@/lib/sample-data";

const GITHUB_URL = "https://github.com/ShadcnDeck/chartcn";

const features = [
  {
    icon: LayoutGrid,
    title: "10 chart types built in",
    description:
      "Bar, Horizontal Bar, Line, Area, Combo, Pie/Donut, Radar, Scatter, Radial/Gauge, and KPI Sparkline cards.",
  },
  {
    icon: Table2,
    title: "Paste, upload, or edit data",
    description:
      "Paste CSV, JSON from your API, TSV from Excel or Sheets, or a Markdown table. Or upload a file or edit the table.",
  },
  {
    icon: SlidersHorizontal,
    title: "Variant toggles per chart",
    description:
      "Switch between stacked or grouped bars, 100% stacking, smooth lines, or donut style.",
  },
  {
    icon: CalendarClock,
    title: "Automatic date axes",
    description:
      "Date columns get formatted axis ticks automatically, no manual date parsing.",
  },
  {
    icon: Palette,
    title: "Custom colors",
    description:
      "Customize series and category colors and see the change reflected in the copied code.",
  },
  {
    icon: FileCode2,
    title: "Two export modes",
    description:
      "Export with data baked in, or as a data prop you wire up to a live API or database.",
  },
  {
    icon: Share2,
    title: "Shareable links",
    description:
      "Share a link that encodes the exact chart, data, and options, so a teammate sees what you see.",
  },
  {
    icon: BookmarkCheck,
    title: "Saved charts",
    description:
      "Save a chart in your browser and it is still there after a refresh.",
  },
  {
    icon: Copy,
    title: "One-click copy",
    description:
      "Copy one self-contained TSX component, no new dependency beyond shadcn/ui and Recharts.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

const chartLinks = [
  { type: "bar", label: "Bar", icon: BarChart3 },
  { type: "line", label: "Line", icon: LineChart },
  { type: "area", label: "Area", icon: AreaChart },
  { type: "pie", label: "Pie", icon: PieChart },
  { type: "radar", label: "Radar", icon: Radar },
] as const;

const installSteps = [
  {
    title: "Add the shadcn/ui chart primitive",
    body: "This gives your project the chart wrapper, tooltip, and legend components every chart here is built on.",
    command: "npx shadcn@latest add chart",
  },
  {
    title: "Make sure Recharts is installed",
    body: "The actual bars, lines, and shapes are rendered by Recharts under the hood.",
    command: "pnpm install recharts",
  },
];

export default function Home() {
  const data = parseCSV(sampleCSV.area);

  return (
    <main className="flex flex-1 flex-col items-center">
      <div className="relative flex w-full flex-col items-center overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_75%_85%_at_50%_20%,#000_30%,transparent_95%)]" />
        <InteractiveGrid className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_75%_85%_at_50%_20%,#000_30%,transparent_95%)]" />
        <div className="pointer-events-none absolute top-[-12rem] left-1/2 -z-10 h-[28rem] w-[42rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[110px]" />

        <div className="flex flex-col items-center gap-16 px-6 pt-24 pb-20 sm:pt-32">
          <div className="flex max-w-2xl flex-col items-center gap-6 text-center">
            <span className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm duration-500">
              <span className="size-1.5 rounded-full bg-primary" />
              Built for shadcn/ui
            </span>

            <h1 className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:fill-mode-both text-4xl font-semibold tracking-tight text-balance duration-700 delay-[80ms] sm:text-6xl">
              Shadcn/ui charts,
              <br />
              <span className="font-serif text-[2.55rem] italic font-normal text-primary sm:text-[3.825rem]">
                CSV in, chart out
              </span>
            </h1>

            <p className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:fill-mode-both max-w-2xl text-lg text-balance text-muted-foreground duration-700 delay-[160ms]">
              An open source shadcn/ui chart component library and generator.
              Paste a CSV or JSON, preview 10 chart types, then copy the code. No config,
              no account.
            </p>

            <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:fill-mode-both flex flex-wrap items-center justify-center gap-3 duration-700 delay-[240ms]">
              <Link
                href="/charts"
                className={cn(buttonVariants({ size: "lg" }))}
              >
                View all charts
              </Link>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                )}
              >
                Star on GitHub
              </a>
            </div>

            <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:fill-mode-both flex flex-wrap items-center justify-center gap-2 pt-2 duration-700 delay-[320ms]">
              {chartLinks.map(({ type, label, icon: Icon }) => (
                <Link
                  key={type}
                  href={`/charts/${type}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <Icon className="size-3.5" />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:fill-mode-both relative w-full max-w-3xl duration-700 delay-[400ms]">
            <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-b from-primary/10 to-transparent blur-2xl" />
            <Card className="w-full overflow-hidden py-0 shadow-xl shadow-black/[0.03] ring-1 ring-border">
              <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-4 py-3">
                <span className="size-2.5 rounded-full bg-chart-5/60" />
                <span className="size-2.5 rounded-full bg-chart-4/60" />
                <span className="size-2.5 rounded-full bg-chart-3/60" />
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  revenue.csv
                </span>
              </div>
              <CardContent className="pt-6">
                <ChartPreview type="area" data={data} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="relative flex w-full flex-col items-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 mx-auto flex w-full max-w-350 justify-between px-4 min-[1800px]:max-w-384 sm:px-6"
        >
          <div className="h-full w-px bg-[repeating-linear-gradient(to_bottom,var(--border)_0px,var(--border)_5px,transparent_5px,transparent_11px)]" />
          <div className="h-full w-px bg-[repeating-linear-gradient(to_bottom,var(--border)_0px,var(--border)_5px,transparent_5px,transparent_11px)]" />
        </div>

        <section className="w-full max-w-4xl border-t border-border px-6 py-20">
          <Reveal className="flex flex-col items-center gap-3 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              New to this?
            </span>
            <h2 className="text-[1.8rem] font-semibold tracking-tight sm:text-4xl">
              Get set up in{" "}
              <span className="font-serif text-4xl italic font-normal text-primary sm:text-[2.7rem]">
                three steps
              </span>
            </h2>
            <p className="max-w-md text-muted-foreground">
              You don&apos;t need to know Recharts or shadcn/ui inside out. Run
              these two commands once in your project, then copy-paste from any
              chart page.
            </p>
          </Reveal>

          <ol className="mt-12 flex flex-col gap-4">
            {installSteps.map((step, index) => (
              <li key={step.command}>
                <Reveal delay={index * 100}>
                  <Card className="flex-row items-center gap-4 py-4 sm:py-5">
                    <CardContent className="flex flex-1 flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div className="flex items-start gap-3">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                          {index + 1}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <h3 className="text-sm font-medium">{step.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {step.body}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 py-1.5 pr-1.5 pl-3 sm:ml-4">
                        <code className="font-mono text-sm whitespace-nowrap text-foreground">
                          {step.command}
                        </code>
                        <CopyButton
                          text={step.command}
                          label="Copy"
                          variant="ghost"
                          size="sm"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </Reveal>
              </li>
            ))}
            <li>
              <Reveal delay={installSteps.length * 100}>
                <Card className="flex-row items-center gap-4 py-4 sm:py-5">
                  <CardContent className="flex flex-1 items-start gap-3 px-4 sm:px-5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      3
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-sm font-medium">
                        Copy a chart into your project
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Open any chart below, paste your own data, then hit{" "}
                        <span className="font-medium text-foreground">
                          Copy component
                        </span>{" "}
                        and drop the code into a file in your app.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
            </li>
          </ol>

          <Reveal
            delay={(installSteps.length + 1) * 100}
            className="mt-10 flex justify-center"
          >
            <Link href="/charts" className={cn(buttonVariants({ size: "lg" }))}>
              Browse the charts
            </Link>
          </Reveal>
        </section>

        <section className="w-full max-w-4xl border-t border-border px-6 py-20">
          <Reveal className="flex flex-col items-center gap-6 text-center">
            <h2 className="text-[1.8rem] font-semibold tracking-tight sm:text-4xl">
              What is{" "}
              <span className="font-serif text-4xl italic font-normal text-primary sm:text-[2.7rem]">
                ChartCN
              </span>
              ?
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Most chart libraries hand you a black box: a new dependency with
              its own design system that never quite matches your app. ChartCN
              skips that trade-off. Paste a CSV, pick from 10 chart types, and
              copy a self-contained TSX component built on shadcn/ui and
              Recharts, the same primitives your project likely already uses.
              Nothing to install, no account to create, and the code is yours to
              edit the moment you paste it.
            </p>
            <p className="max-w-2xl text-muted-foreground">
              If you are not a developer, here is the short version: a
              &ldquo;chart component&rdquo; is a small piece of code that draws
              a chart and matches the look of the app around it. ChartCN builds
              that piece of code from a CSV, the same file format Excel, Google
              Sheets, or a database export already produces. Hand it to a
              developer on your team, and it drops into the product in minutes,
              with no redesign required.
            </p>
          </Reveal>
        </section>

        <section className="w-full max-w-5xl border-t border-border px-6 py-20">
          <Reveal className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-[1.8rem] font-semibold tracking-tight sm:text-4xl">
              What&apos;s{" "}
              <span className="font-serif text-4xl italic font-normal text-primary sm:text-[2.7rem]">
                included
              </span>
            </h2>
            <p className="max-w-lg text-muted-foreground">
              Every component ChartCN generates is plain shadcn/ui and Recharts
              code. Here is what comes built in.
            </p>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 60}>
                <div className="flex flex-col gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <feature.icon className="size-5" />
                  </span>
                  <h3 className="font-medium text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="w-full max-w-4xl border-t border-border px-6 py-20">
          <Reveal className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-[1.8rem] font-semibold tracking-tight sm:text-4xl">
              Frequently asked{" "}
              <span className="font-serif text-4xl italic font-normal text-primary sm:text-[2.7rem]">
                questions
              </span>
            </h2>
          </Reveal>
          <Reveal className="mt-8">
            <Accordion className="mx-auto max-w-2xl gap-3 rounded-2xl bg-muted/60 p-3 sm:p-4">
              {faqs.map((faq) => (
                <AccordionItem
                  key={faq.question}
                  value={faq.question}
                  className="rounded-xl border border-border bg-card px-5"
                >
                  <AccordionTrigger className="text-base">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </section>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </main>
  );
}
