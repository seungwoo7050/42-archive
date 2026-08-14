import {
  PortfolioReadinessError,
  validateBuildReadiness,
} from "../src/lib/content-readiness";
import { loadPortfolioSource } from "../src/lib/content-loader";

try {
  const result = validateBuildReadiness(loadPortfolioSource(), {
    PORTFOLIO_CONTENT_MODE: process.env.PORTFOLIO_CONTENT_MODE,
    SITE_URL: process.env.SITE_URL,
  });

  if (result.mode === "template") {
    console.log(
      "Content mode: template. Production readiness is skipped and indexing remains disabled.",
    );
  } else {
    console.log(`Production readiness valid for ${result.siteUrl.origin}.`);
  }
} catch (error) {
  if (error instanceof PortfolioReadinessError) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
