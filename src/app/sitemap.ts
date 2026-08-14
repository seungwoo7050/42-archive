import type { MetadataRoute } from "next";

import {
  resolvePortfolioContentMode,
  resolveProductionSiteUrl,
} from "@/lib/content-readiness";
import { getPortfolioContent } from "@/lib/portfolio";
import { createSitemap } from "@/lib/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const mode = resolvePortfolioContentMode(
    process.env.PORTFOLIO_CONTENT_MODE,
  );
  const siteUrl =
    mode === "production"
      ? resolveProductionSiteUrl(process.env.SITE_URL)
      : undefined;

  return createSitemap({ content: getPortfolioContent(), mode, siteUrl });
}
