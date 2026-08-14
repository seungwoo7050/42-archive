import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import presentationJson from "../../src/content/presentation.json";
import {
  designIds,
  enabledRoutes,
  withExplicitDesign,
  type DesignId,
} from "./site-matrix";

const wcag22AATags = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
] as const;

function formatViolations(
  designId: DesignId,
  path: string,
  violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"],
) {
  return violations
    .map(
      (violation) =>
        `${designId} ${path}: ${violation.id} (${violation.impact ?? "unknown"})\n${violation.nodes
          .map((node) => `  ${node.target.join(" ")}\n  ${node.failureSummary}`)
          .join("\n")}`,
    )
    .join("\n\n");
}

async function expectAccessibleRoute(
  page: Page,
  path: string,
  designId: DesignId,
) {
  const response = await page.goto(withExplicitDesign(path, designId));

  expect(response?.ok()).toBe(true);
  await expect(page.locator(`[data-site-design="${designId}"]`)).toBeVisible();
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("banner")).toHaveCount(1);
  await expect(page.getByRole("contentinfo")).toHaveCount(1);

  const results = await new AxeBuilder({ page })
    .withTags([...wcag22AATags])
    .analyze();

  expect(
    results.violations,
    formatViolations(designId, path, results.violations),
  ).toEqual([]);
}

for (const designId of designIds) {
  test(`${designId}: every enabled route passes WCAG 2.2 AA checks`, async ({
    page,
  }) => {
    test.slow();

    for (const { path } of enabledRoutes) {
      await expectAccessibleRoute(page, path, designId);
    }
  });

  test(`${designId}: keyboard users can skip repeated navigation`, async ({
    page,
  }) => {
    await page.goto(withExplicitDesign("/", designId));

    const skipLink = page.getByRole("link", {
      name: presentationJson.ui.skipLinkLabel,
    });
    const main = page.getByRole("main");

    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(main).toBeFocused();
  });
}
