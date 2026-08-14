import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

const tokenFamilies = [
  "--type-display",
  "--type-body",
  "--space-section",
  "--breakpoint-content",
  "--motion-fast",
  "--layer-navigation",
  "--content-width",
] as const;

describe("design tokens", () => {
  it.each(tokenFamilies)("defines the %s token", (token) => {
    expect(stylesheet).toContain(`${token}:`);
  });

  it.each(["design", "classic"])(
    "keeps the %s renderer token scope explicit",
    (designId) => {
      expect(stylesheet).toMatch(
        new RegExp(`\\[data-site-design=["']${designId}["']\\][\\s\\S]*?--content-width:`),
      );
    },
  );
});
