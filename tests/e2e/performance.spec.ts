import { expect, test, type Request } from "@playwright/test";

import {
  designIds,
  firstEnabledProject,
  withExplicitDesign,
} from "./site-matrix";

const firstProjectId = firstEnabledProject?.id;

if (!firstProjectId) {
  throw new Error("The performance check needs an enabled project.");
}

const initialRoutes = [
  { label: "home", path: "/" },
  {
    label: "project detail",
    path: `/projects/${firstProjectId}`,
  },
] as const;

for (const designId of designIds) {
  for (const route of initialRoutes) {
    test(`${designId} ${route.label} does not prefetch before user interaction`, async ({
      page,
    }) => {
      const prefetchedRoutes: string[] = [];
      const loadedFonts: string[] = [];

      const recordPrefetch = (request: Request) => {
        const url = new URL(request.url());

        if (url.searchParams.has("_rsc")) {
          prefetchedRoutes.push(`${url.pathname}${url.search}`);
        }
        if (request.resourceType() === "font") {
          loadedFonts.push(url.pathname);
        }
      };

      page.on("request", recordPrefetch);
      const response = await page.goto(
        withExplicitDesign(route.path, designId),
      );

      expect(response?.ok()).toBe(true);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await page.waitForTimeout(1_000);
      page.off("request", recordPrefetch);

      const monoUsers = await page.locator("body *").evaluateAll((elements) =>
        elements
          .map((element) => ({
            className:
              element instanceof HTMLElement ? element.className : undefined,
            fontFamily: getComputedStyle(element).fontFamily,
            tagName: element.tagName,
          }))
          .filter(({ fontFamily }) => /geist.?mono/i.test(fontFamily))
          .slice(0, 20),
      );

      const { monoFontPaths, preloadedFontPaths } = await page.evaluate(() => {
        const monoSources = new Set<string>();

        for (const stylesheet of Array.from(document.styleSheets)) {
          let rules: CSSRuleList;

          try {
            rules = stylesheet.cssRules;
          } catch {
            continue;
          }

          for (const rule of Array.from(rules)) {
            if (
              !(rule instanceof CSSFontFaceRule) ||
              !/geist.?mono/i.test(rule.style.getPropertyValue("font-family"))
            ) {
              continue;
            }

            const source = rule.style.getPropertyValue("src");
            const baseUrl = stylesheet.href ?? document.baseURI;
            const sourcePattern = /url\(\s*["']?([^"')]+)["']?\s*\)/g;

            for (const match of source.matchAll(sourcePattern)) {
              const sourceUrl = match[1];

              if (sourceUrl) {
                monoSources.add(new URL(sourceUrl, baseUrl).pathname);
              }
            }
          }
        }

        return {
          monoFontPaths: Array.from(monoSources),
          preloadedFontPaths: Array.from(
            document.querySelectorAll<HTMLLinkElement>(
              'link[rel~="preload"][as="font"]',
            ),
            (link) => new URL(link.href, document.baseURI).pathname,
          ),
        };
      });

      expect(prefetchedRoutes, designId).toEqual([]);
      expect(monoFontPaths, "Geist Mono @font-face source").not.toEqual([]);
      expect(
        preloadedFontPaths.filter((path) => monoFontPaths.includes(path)),
        `${designId}: Geist Mono preload`,
      ).toEqual([]);
      if (designId === "design" || designId === "editorial") {
        expect(
          loadedFonts.filter((path) => monoFontPaths.includes(path)),
          `${designId}: ${JSON.stringify(monoUsers)}`,
        ).toEqual([]);
      }
    });
  }
}
