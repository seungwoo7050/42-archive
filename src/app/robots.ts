import type { MetadataRoute } from "next";

import {
  resolvePortfolioContentMode,
  resolveProductionSiteUrl,
} from "@/lib/content-readiness";
import { createRobots } from "@/lib/site-metadata";

export default function robots(): MetadataRoute.Robots {
  const mode = resolvePortfolioContentMode(
    process.env.PORTFOLIO_CONTENT_MODE,
  );
  const siteUrl =
    mode === "production"
      ? resolveProductionSiteUrl(process.env.SITE_URL)
      : undefined;

  return createRobots({ mode, siteUrl });
}
