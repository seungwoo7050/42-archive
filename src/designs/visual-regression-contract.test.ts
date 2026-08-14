import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { SITE_DESIGN_IDS } from "./config";

const snapshotDirectory = resolve(
  process.cwd(),
  "tests/e2e/visual.spec.ts-snapshots",
);

const expectedSnapshotManifest = SITE_DESIGN_IDS.flatMap((designId) => [
  `home-${designId}-chromium.png`,
  `home-${designId}-mobile-chrome.png`,
  `project-${designId}-chromium.png`,
]).sort();

describe("visual regression contract", () => {
  it("keeps the exact desktop and mobile snapshot manifest", () => {
    const actualSnapshotManifest = readdirSync(snapshotDirectory)
      .filter((fileName) => fileName.endsWith(".png"))
      .sort();

    expect(actualSnapshotManifest).toEqual(expectedSnapshotManifest);
  });
});
