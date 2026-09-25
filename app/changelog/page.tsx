import type { Metadata } from "next"
import Image from "next/image"
import { ArrowDown, ArrowUpRight, ChevronRight } from "lucide-react"

import { BreadcrumbChip } from "@/components/breadcrumb-chip"
import { Reveal } from "@/components/reveal"
import { buttonVariants } from "@/components/ui/button"
import { compareUrl, releases, repoUrl, type ChangeKind, type Release } from "@/lib/changelog"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "Version history for Chartcn: new chart types, fixes, and anything you need to change when you re-copy a component.",
  alternates: {
    canonical: "/changelog",
  },
}

const kinds: { kind: ChangeKind; label: string }[] = [
  { kind: "added", label: "New" },
  { kind: "changed", label: "Improved" },
  { kind: "fixed", label: "Fixed" },
  { kind: "removed", label: "Removed" },
]

const longDate = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })

/** Renders `backtick` spans as inline code. */
function RichText({ text }: { text: string }) {
  return text.split(/(`[^`]+`)/).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code key={i} className="rounded-md border border-border bg-muted/60 px-1.5 py-px font-mono text-[0.85em] text-foreground">
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    )
  )
}

function ReleaseEntry({ release, index }: { release: Release; index: number }) {
  const previous = releases[index + 1]

  return (
    <li id={`v${release.version}`} className="grid scroll-mt-24 grid-cols-1 gap-4 md:grid-cols-[10rem_1fr] md:gap-10">
      <div className="flex items-center gap-3 md:sticky md:top-24 md:flex-col md:items-start md:self-start md:gap-2">
        <a
          href={`#v${release.version}`}
          className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-medium text-primary ring-1 ring-primary/20 transition-colors hover:bg-primary/15"
        >
          v{release.version}
        </a>
        <time dateTime={release.date} className="text-sm text-muted-foreground">
          {longDate.format(new Date(release.date))}
        </time>
      </div>

      <Reveal className="flex min-w-0 max-w-3xl flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-[1.7rem]">{release.title}</h2>
        <p className="leading-relaxed text-muted-foreground">{release.description}</p>

        <details className="group/more">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80 [&::-webkit-details-marker]:hidden">
            <span className="group-open/more:hidden">Read more</span>
            <span className="hidden group-open/more:inline">Show less</span>
            <ChevronRight className="size-4 transition-transform group-open/more:rotate-90" />
          </summary>

          <div className="mt-4 flex flex-col gap-4 rounded-xl border border-border bg-card p-5 text-sm">
            <ul className="flex flex-col gap-2">
              {release.changes.map((change) => (
                <li key={change.text} className="flex items-baseline gap-3 leading-relaxed">
                  <span className="w-16 shrink-0 text-xs text-muted-foreground">
                    {kinds.find((k) => k.kind === change.kind)?.label}
                  </span>
                  <span>
                    <RichText text={change.text} />
                  </span>
                </li>
              ))}
            </ul>
            {release.upgradeNotes && (
              <p className="border-t border-border pt-4 text-muted-foreground">
                <span className="font-medium text-foreground">Upgrading: </span>
                <RichText text={release.upgradeNotes} />
              </p>
            )}
            <a
              href={compareUrl(index)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              {previous ? `Code changes since v${previous.version}` : "View on GitHub"}
              <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        </details>

        <div className="relative mt-4 aspect-video overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/40 via-primary/10 to-chart-5/30">
          <Image
            src={release.image}
            alt={`Chartcn v${release.version}: ${release.title}`}
            placeholder="blur"
            sizes="(min-width: 1024px) 720px, 100vw"
            className="absolute top-[8%] left-[6%] w-[88%] rounded-lg shadow-2xl ring-1 shadow-black/40 ring-white/10"
          />
        </div>
      </Reveal>
    </li>
  )
}

export default function ChangelogPage() {
  const latest = releases[0]
  const totalChanges = releases.reduce((n, r) => n + r.changes.length, 0)

  return (
    <main className="flex flex-1 flex-col">
      <div className="relative overflow-hidden border-b border-border">
        <div className="bg-grid pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_70%_90%_at_30%_0%,#000_30%,transparent_90%)]" />

        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 pt-16 pb-14 sm:pt-24 lg:grid-cols-[1fr_24rem]">
        <div className="flex flex-col gap-6">
          <BreadcrumbChip items={[{ label: "Chartcn", href: "/" }, { label: "Changelog" }]} />
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            What&apos;s{" "}
            <span className="font-serif text-[2.6rem] italic font-normal text-primary sm:text-[3.4rem]">new</span>
          </h1>
          <p className="max-w-md text-lg text-balance text-muted-foreground">
            New charts, fixes, and upgrade notes for every release.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <a href={`#v${latest.version}`} className={cn(buttonVariants({ size: "lg" }), "lg:hidden")}>
              Latest: v{latest.version}
            </a>
            <a
              href={`${repoUrl}/releases`}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              GitHub releases
              <ArrowUpRight className="size-4" />
            </a>
          </div>

          <dl className="mt-2 grid max-w-md grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card">
            {[
              ["Releases", releases.length],
              ["Changes", totalChanges],
              ["Updated", shortDate.format(new Date(latest.date))],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5 px-4 py-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-xl font-semibold tracking-tight tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <a
          href={`#v${latest.version}`}
          className="group hidden flex-col gap-4 rounded-xl border border-border bg-card p-6 transition-colors hover:border-foreground/30 lg:flex"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">Latest release</span>
            <span className="font-mono font-medium">v{latest.version}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-lg leading-snug font-semibold tracking-tight">{latest.title}</p>
            <p className="text-sm text-muted-foreground">{longDate.format(new Date(latest.date))}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {kinds
              .map((k) => ({ ...k, count: latest.changes.filter((c) => c.kind === k.kind).length }))
              .filter((k) => k.count > 0)
              .map(({ label, count }) => `${count} ${label.toLowerCase()}`)
              .join(" · ")}
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
            Read release notes
            <ArrowDown className="size-4 transition-transform group-hover:translate-y-0.5" />
          </span>
        </a>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24">
        <ol className="flex flex-col gap-24">
          {releases.map((release, index) => (
            <ReleaseEntry key={release.version} release={release} index={index} />
          ))}
        </ol>
      </div>
    </main>
  )
}
