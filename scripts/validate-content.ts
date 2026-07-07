import { resolve } from "node:path";

import { validatePortfolioAssets } from "../src/lib/content-assets";
import { loadPortfolioSource } from "../src/lib/content-loader";

const content = validatePortfolioAssets(
  loadPortfolioSource(),
  resolve(process.cwd(), "public"),
);

console.log(
  `Content valid: ${content.projects.items.length} projects, ${content.presentation.templates.length} designs.`,
);
