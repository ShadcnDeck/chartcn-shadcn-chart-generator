export const SITE_URL = "https://www.shadcndeck.com/chartcn"
export const SITE_NAME = "ChartCN"

/** Must match `basePath` in next.config.ts. */
export const BASE_PATH = "/chartcn"

export const ORGANIZATION_URL = "https://www.shadcndeck.com"
export const GITHUB_ORG_URL = "https://github.com/ShadcnDeck"
export const GITHUB_URL = `${GITHUB_ORG_URL}/chartcn-shadcn-chart-generator`

/** Last content change (YYYY-MM-DD) per page, used as the sitemap's lastmod.
 * Bump a page's date by hand when its content changes; never stamp builds.
 * Chart pages keep theirs in `chartSeo[type].updated`, and the changelog uses
 * its newest release date. */
export const PAGE_UPDATED = {
  home: "2026-11-02",
  charts: "2026-11-03",
}
