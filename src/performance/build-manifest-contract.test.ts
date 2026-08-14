import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

import { parseClientReferenceManifest } from "../../scripts/route-budgets.mjs";

const require = createRequire(import.meta.url);
const packageJson = require("../../package.json");

describe("production build pipeline", () => {
  it("uses the verified webpack compiler path", () => {
    expect(packageJson.scripts.build).toBe("next build --webpack");
  });
});

describe("webpack client reference manifest parser", () => {
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
});
