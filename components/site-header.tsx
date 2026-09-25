import Link from "next/link"

import { ShadcnDeckLogo } from "@/components/shadcndeck-logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { badgeVariants } from "@/components/ui/badge"
import { currentVersion } from "@/lib/changelog"
import { GITHUB_URL, ORGANIZATION_URL as SHADCNDECK_URL } from "@/lib/seo"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 flex min-h-16 w-full shrink-0 items-center justify-center border-b bg-background/60 backdrop-blur-sm">
      <div className="mx-auto flex h-full w-full max-w-350 items-center px-4 min-[1800px]:max-w-384 sm:px-6">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/" aria-label="Chartcn home">
              <ShadcnDeckLogo className="size-8 text-foreground" />
            </Link>
            <span className="flex items-baseline gap-1.5 whitespace-nowrap">
              <Link href="/" className="text-2xl font-semibold tracking-tight">
                Chartcn
              </Link>
              <a
                href={SHADCNDECK_URL}
                className="hidden text-base text-muted-foreground transition-colors hover:text-foreground hover:underline sm:inline"
              >
                by ShadcnDeck
              </a>
            </span>
            <Link
              href="/changelog"
              title="View version history"
              className={cn(badgeVariants({ variant: "outline" }), "hidden font-mono sm:inline-flex")}
            >
              v{currentVersion}
            </Link>
          </div>

          <nav className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/charts"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Charts
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              GitHub
            </a>
          </nav>

          <div className="flex items-center">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
