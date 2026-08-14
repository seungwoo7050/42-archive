import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

import {
  BUDGET_GROWTH_FACTOR,
  evaluateRouteBudgets,
  parseClientReferenceManifest,
  type RouteBudgetBaseline,
  type RouteBundleMeasurement,
} from "../../scripts/route-budgets.mjs";

const require = createRequire(import.meta.url);
const lighthouseConfig = require("../../lighthouserc.cjs");
const packageJson = require("../../package.json");

describe("production build pipeline", () => {
  it("uses the verified webpack compiler path", () => {
    expect(packageJson.scripts.build).toBe("next build --webpack");
  });
});

describe("production performance gates", () => {
  it("runs three production measurements for every visual design", () => {
    const collect = lighthouseConfig.ci.collect;
    const urls = collect.url as string[];

    expect(collect.startServerCommand).toBe("npm run start:performance");
    expect(collect.numberOfRuns).toBe(3);
    expect(collect.settings.preset).toBe("desktop");
    expect(urls).toHaveLength(10);

    for (const designId of [
      "design",
      "classic",
      "editorial",
      "brutalist",
      "cinematic",
    ]) {
      expect(urls).toContain(`http://localhost:3300/?view=${designId}`);
      expect(urls).toContain(
        `http://localhost:3300/projects/example-project?view=${designId}`,
      );
    }
  });

  it("enforces the agreed Lighthouse and lab responsiveness targets", () => {
    const assertions = lighthouseConfig.ci.assert.assertions;

    expect(assertions["categories:performance"]).toEqual([
      "error",
      expect.objectContaining({ minScore: 0.9 }),
    ]);
    expect(assertions["categories:accessibility"]).toEqual([
      "error",
      expect.objectContaining({ minScore: 0.95 }),
    ]);
    expect(assertions["largest-contentful-paint"]).toEqual([
      "error",
      expect.objectContaining({ maxNumericValue: 2_500 }),
    ]);
    expect(assertions["cumulative-layout-shift"]).toEqual([
      "error",
      expect.objectContaining({ maxNumericValue: 0.1 }),
    ]);
    expect(assertions["total-blocking-time"]).toEqual([
      "error",
      expect.objectContaining({ maxNumericValue: 200 }),
    ]);
  });
});

describe("route bundle budgets", () => {
  it("parses the compact webpack client reference manifest", () => {
    const source =
      'globalThis.__RSC_MANIFEST=(globalThis.__RSC_MANIFEST||{});globalThis.__RSC_MANIFEST["/about/page"]={"entryJSFiles":{"route":["static/chunks/page.js"]}};';

    expect(parseClientReferenceManifest(source, "about.js")).toEqual({
      entryJSFiles: {
        route: ["static/chunks/page.js"],
      },
    });
  });

  it("parses a dynamic route key containing square brackets", () => {
    const source =
      'globalThis.__RSC_MANIFEST=(globalThis.__RSC_MANIFEST||{});globalThis.__RSC_MANIFEST["/projects/[projectId]/page"]={"entryJSFiles":{}};';

    expect(parseClientReferenceManifest(source, "project.js")).toEqual({
      entryJSFiles: {},
    });
  });

  const baseline: RouteBudgetBaseline = {
    schemaVersion: 1,
    growthLimitPercent: 5,
    routes: {
      "/": { cssBytes: 100, jsBytes: 1_000 },
      "/projects/[projectId]": { cssBytes: 200, jsBytes: 2_000 },
    },
  };

  it("allows at most five percent growth per route and asset type", () => {
    const measurements: RouteBundleMeasurement = {
      "/": { cssBytes: 105, jsBytes: 1_050 },
      "/projects/[projectId]": { cssBytes: 210, jsBytes: 2_100 },
    };

    expect(BUDGET_GROWTH_FACTOR).toBe(1.05);
    expect(evaluateRouteBudgets(measurements, baseline)).toEqual([]);
  });

  it("reports a route and asset when the measured output exceeds its budget", () => {
    const measurements: RouteBundleMeasurement = {
      "/": { cssBytes: 106, jsBytes: 1_050 },
      "/projects/[projectId]": { cssBytes: 210, jsBytes: 2_101 },
    };

    expect(evaluateRouteBudgets(measurements, baseline)).toEqual([
      expect.objectContaining({ asset: "css", route: "/" }),
      expect.objectContaining({
        asset: "js",
        route: "/projects/[projectId]",
      }),
    ]);
  });

  it("fails closed when a baseline route is missing from the build", () => {
    expect(evaluateRouteBudgets({}, baseline)).toEqual([
      expect.objectContaining({ asset: "route", route: "/" }),
      expect.objectContaining({
        asset: "route",
        route: "/projects/[projectId]",
      }),
    ]);
  });
});
