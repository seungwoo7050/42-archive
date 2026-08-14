import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const layoutSource = readFileSync(
  resolve(projectRoot, "src/app/layout.tsx"),
  "utf8",
);

describe("local font registration", () => {
  it("does not depend on Google Fonts at build time", () => {
    expect(layoutSource).toContain('from "next/font/local"');
    expect(layoutSource).not.toMatch(
      /next\/font\/google|fonts\.googleapis\.com|fonts\.gstatic\.com/,
    );
  });

  it.each([
    ["./fonts/Geist-Variable.woff2", "Geist-Variable.woff2"],
    ["./fonts/GeistMono-Variable.woff2", "GeistMono-Variable.woff2"],
    [
      "./fonts/SourceHanSerifKR-Variable.woff2",
      "SourceHanSerifKR-Variable.woff2",
    ],
  ])("keeps %s as a valid repository asset", (sourcePath, fileName) => {
    expect(layoutSource).toContain(sourcePath);

    const font = readFileSync(resolve(projectRoot, "src/app/fonts", fileName));
    expect(font.subarray(0, 4).toString("ascii")).toBe("wOF2");
  });

  it.each([
    "Geist-OFL-1.1.txt",
    "SourceHanSerif-OFL-1.1.txt",
  ])("keeps the license notice for %s", (fileName) => {
    const license = readFileSync(
      resolve(projectRoot, "src/app/fonts/licenses", fileName),
      "utf8",
    );

    expect(license).toContain("SIL OPEN FONT LICENSE Version 1.1");
  });
});
