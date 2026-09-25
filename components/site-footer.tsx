import { Mail } from "lucide-react"
import Link from "next/link"

import { ShadcnDeckLogo } from "@/components/shadcndeck-logo"

const SHADCNDECK_URL = "https://shadcndeck.com"
const SUPPORT_EMAIL = "support@shadcndeck.com"

const footerColumns: {
  heading: string
  links: { label: string; href: string; external?: boolean }[]
}[] = [
  {
    heading: "Tech Stack",
    links: [
      { label: "Shadcn/ui", href: "https://ui.shadcn.com/", external: true },
      { label: "Next.js", href: "https://nextjs.org/", external: true },
      { label: "Tailwind CSS", href: "https://tailwindcss.com/", external: true },
      { label: "React", href: "https://react.dev/", external: true },
    ],
  },
  {
    heading: "Shadcn Templates",
    links: [
      { label: "Shadcn Templates", href: `${SHADCNDECK_URL}/templates`, external: true },
      {
        label: "ChatDeck SaaS Landing Page",
        href: `${SHADCNDECK_URL}/templates/chatdeck-saas-landing-page`,
        external: true,
      },
      { label: "Free Shadcn templates", href: `${SHADCNDECK_URL}/templates/free`, external: true },
      { label: "All Shadcn Templates", href: `${SHADCNDECK_URL}/templates`, external: true },
    ],
  },
  {
    heading: "Guides",
    links: [
      { label: "Blog", href: `${SHADCNDECK_URL}/blog`, external: true },
      { label: "Shadcn Components", href: `${SHADCNDECK_URL}/blog/shadcn-components`, external: true },
      { label: "Shadcn Theming", href: `${SHADCNDECK_URL}/blog/shadcn-theming`, external: true },
      { label: "Theme Editor", href: `${SHADCNDECK_URL}/shadcn-theme-generator`, external: true },
    ],
  },
  {
    heading: "Help & Support",
    links: [
      { label: "Support Center", href: `${SHADCNDECK_URL}/support`, external: true },
      { label: "License & Usage", href: `${SHADCNDECK_URL}/license`, external: true },
      { label: "Refund Policy", href: `${SHADCNDECK_URL}/terms`, external: true },
      { label: "Credits", href: `${SHADCNDECK_URL}/credits`, external: true },
    ],
  },
]

const legalLinks = [
  { label: "Privacy Policy", href: `${SHADCNDECK_URL}/privacy` },
  { label: "Terms of Service", href: `${SHADCNDECK_URL}/terms` },
  { label: "License & Usage", href: `${SHADCNDECK_URL}/license` },
  { label: "Contact", href: `mailto:${SUPPORT_EMAIL}` },
]

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative w-full shrink-0 overflow-hidden border-t bg-background">
      <div className="relative mx-auto w-full max-w-350 px-4 py-12 min-[1800px]:max-w-384 sm:px-6">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-6">
          <div className="col-span-2 flex flex-col gap-3 sm:col-span-6 sm:mb-4 md:col-span-2 md:mb-0">
            <div className="flex items-center gap-2">
              <Link href="/" aria-label="Chartcn home">
                <ShadcnDeckLogo className="size-7 text-foreground" />
              </Link>
              <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                <Link href="/" className="text-lg font-semibold tracking-tight">
                  Chartcn
                </Link>
                <a
                  href={SHADCNDECK_URL}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
                >
                  by ShadcnDeck
                </a>
              </span>
            </div>
            <p className="text-sm font-[665] text-foreground">Shadcn/ui charts, CSV in, chart out</p>
            <p className="max-w-72 text-sm text-muted-foreground">
              Free, open source CSV to chart generator for shadcn/ui and React. Paste a CSV,
              preview 13 chart types, then copy the code.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Mail className="size-4" aria-hidden="true" />
              {SUPPORT_EMAIL}
            </a>
          </div>

          {footerColumns.map((column) => (
            <div key={column.heading} className="flex flex-col gap-3">
              <h3 className="text-sm font-bold">{column.heading}</h3>
              <ul className="flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noreferrer" : undefined}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col-reverse items-center justify-between gap-4 border-t pt-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {year} Shadcndeck, Made with ❤️ for the shadcn community.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {legalLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}

            <div className="flex items-center gap-4">
              <a
                href="https://twitter.com/shadcndeck"
                target="_blank"
                rel="noreferrer"
                aria-label="ShadcnDeck on Twitter"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://github.com/shadcndeck"
                target="_blank"
                rel="noreferrer"
                aria-label="ShadcnDeck on GitHub"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
                  <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.69-1.28-1.69-1.04-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.3-.52-1.5.11-3.12 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.62.24 2.82.12 3.12.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.07.78 2.15 0 1.56-.01 2.81-.01 3.19 0 .3.21.66.79.55A10.51 10.51 0 0 0 23.5 12c0-6.27-5.23-11.5-11.5-11.5z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
