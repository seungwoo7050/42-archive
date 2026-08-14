import { expect, test, type Page } from "@playwright/test";

import {
  designIds,
  firstEnabledProject,
  withExplicitDesign,
} from "./site-matrix";

const projectId = firstEnabledProject?.id;

if (!projectId) {
  throw new Error("Visual snapshots need one enabled project.");
}

async function prepareStablePage(page: Page, path: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = await page.goto(path, { waitUntil: "networkidle" });

  expect(response?.ok()).toBe(true);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images, (image) => {
        if (image.complete) {
          return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        });
      }),
    );
  });
}

for (const designId of designIds) {
  test(
    `${designId}: home visual`,
    { tag: "@visual" },
    async ({ page }, testInfo) => {
      await prepareStablePage(page, withExplicitDesign("/", designId));

      await expect(page).toHaveScreenshot(`home-${designId}.png`, {
        animations: "disabled",
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });

      expect(["chromium", "mobile-chrome"]).toContain(testInfo.project.name);
    },
  );

  test(
    `${designId}: project detail desktop visual`,
    { tag: "@visual" },
    async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "chromium", "Desktop reference only.");

      await prepareStablePage(
        page,
        withExplicitDesign(`/projects/${projectId}`, designId),
      );

      await expect(page).toHaveScreenshot(`project-${designId}.png`, {
        animations: "disabled",
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    },
  );
}
