/** schema.org structured data (JSON-LD) for each page type. Nodes reference
 * each other by @id so Google sees one connected graph: the organization
 * publishes the website, which contains the pages, which describe the app
 * and the copy-paste component. No ratings or reviews are included: those
 * must come from real reviews to be allowed. */

import { chartSeo } from "@/lib/chart-seo"
import type { Faq } from "@/lib/faq"
import { chartTypeDescriptions, chartTypeLabels, chartTypes } from "@/lib/sample-data"
import { GITHUB_ORG_URL, GITHUB_URL, ORGANIZATION_URL, SITE_NAME, SITE_URL } from "@/lib/seo"
import type { ChartType } from "@/types/chart"

const ORG_ID = `${ORGANIZATION_URL}/#organization`
const WEBSITE_ID = `${SITE_URL}/#website`
const APP_ID = `${SITE_URL}/#app`

const organization = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: "ShadcnDeck",
  url: ORGANIZATION_URL,
  logo: `${SITE_URL}/icon.svg`,
  sameAs: [GITHUB_ORG_URL],
}

const website = {
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: SITE_URL,
  name: SITE_NAME,
  inLanguage: "en",
  publisher: { "@id": ORG_ID },
}

const application = {
  "@type": "WebApplication",
  "@id": APP_ID,
  name: SITE_NAME,
  url: SITE_URL,
  description:
    "Free, open source generator that turns CSV or JSON data into copy-paste shadcn/ui chart components built on Recharts.",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any (web browser)",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  license: "https://opensource.org/licenses/MIT",
  publisher: { "@id": ORG_ID },
}

function faqPage(id: string, faqs: Faq[]) {
  return {
    "@type": "FAQPage",
    "@id": id,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  }
}

function breadcrumbs(id: string, items: { name: string; url: string }[]) {
  return {
    "@type": "BreadcrumbList",
    "@id": id,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function homeSchema(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      website,
      application,
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/#webpage`,
        url: SITE_URL,
        name: "ChartCN: Free Open Source Shadcn UI Chart Generator",
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": APP_ID },
        mainEntity: { "@id": `${SITE_URL}/#faq` },
      },
      faqPage(`${SITE_URL}/#faq`, faqs),
    ],
  }
}

export function gallerySchema() {
  const url = `${SITE_URL}/charts`
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      website,
      {
        "@type": "CollectionPage",
        "@id": `${url}#webpage`,
        url,
        name: "Shadcn UI Chart Gallery",
        isPartOf: { "@id": WEBSITE_ID },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: chartTypes.length,
          itemListElement: chartTypes.map((type, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${SITE_URL}/charts/${type}`,
            name: chartTypeLabels[type],
            description: chartTypeDescriptions[type],
          })),
        },
      },
      breadcrumbs(`${url}#breadcrumb`, [
        { name: SITE_NAME, url: SITE_URL },
        { name: "Charts", url },
      ]),
    ],
  }
}

export function chartPageSchema(type: ChartType, imageUrl: string) {
  const seo = chartSeo[type]
  const url = `${SITE_URL}/charts/${type}`
  const label = chartTypeLabels[type]
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      website,
      application,
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: seo.title,
        description: seo.description,
        inLanguage: "en",
        isPartOf: { "@id": WEBSITE_ID },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        about: { "@id": `${url}#component` },
        primaryImageOfPage: { "@type": "ImageObject", url: imageUrl, caption: seo.imageAlt },
        keywords: seo.keyword,
      },
      breadcrumbs(`${url}#breadcrumb`, [
        { name: SITE_NAME, url: SITE_URL },
        { name: "Charts", url: `${SITE_URL}/charts` },
        { name: label, url },
      ]),
      {
        // The copy-paste component this page generates.
        "@type": "SoftwareSourceCode",
        "@id": `${url}#component`,
        name: `${seo.h1.replace(/ Generator$/, "")} component`,
        description: seo.intro,
        url,
        codeSampleType: "full solution",
        programmingLanguage: { "@type": "ComputerLanguage", name: "TypeScript" },
        runtimePlatform: "React",
        codeRepository: GITHUB_URL,
        license: "https://opensource.org/licenses/MIT",
        keywords: [seo.keyword, "shadcn/ui", "Recharts", "React", "Next.js", "Tailwind CSS"],
        isAccessibleForFree: true,
        isPartOf: { "@id": APP_ID },
        author: { "@id": ORG_ID },
      },
      faqPage(`${url}#faq`, seo.faqs),
    ],
  }
}
