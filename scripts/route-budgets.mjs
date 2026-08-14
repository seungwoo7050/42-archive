import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const BUDGET_GROWTH_FACTOR = 1.05;

const DEFAULT_BUILD_DIRECTORY = ".next";
const DEFAULT_BASELINE_PATH = "performance/route-budgets.json";

function routeFromManifestKey(key) {
  if (key === "/page") {
    return "/";
  }

  return key.replace(/\/page$/, "");
}

export function parseClientReferenceManifest(source, filename) {
  const assignment =
    /globalThis\.__RSC_MANIFEST\[[\s\S]+?\]\s*=\s*/.exec(source);
  const serialized = assignment
    ? source.slice(assignment.index + assignment[0].length).trim()
    : "";

  if (!assignment || !serialized.endsWith(";")) {
    throw new Error(`Cannot parse client reference manifest: ${filename}`);
  }

  return JSON.parse(serialized.slice(0, -1));
}

async function assetBytes(buildDirectory, assets) {
  const sizes = await Promise.all(
    [...new Set(assets)].map(async (asset) => {
      const assetPath = path.join(buildDirectory, asset.replace(/^\//, ""));
      return (await stat(assetPath)).size;
    }),
  );

  return sizes.reduce((total, size) => total + size, 0);
}

export async function collectRouteBundleMeasurements(
  buildDirectory = DEFAULT_BUILD_DIRECTORY,
) {
  const appPaths = JSON.parse(
    await readFile(
      path.join(buildDirectory, "server/app-paths-manifest.json"),
      "utf8",
    ),
  );
  const buildManifest = JSON.parse(
    await readFile(path.join(buildDirectory, "build-manifest.json"), "utf8"),
  );
  const sharedJavaScript = buildManifest.rootMainFiles ?? [];
  const measurements = {};

  for (const key of Object.keys(appPaths).sort()) {
    if (!key.endsWith("/page") || key.startsWith("/_")) {
      continue;
    }

    const route = routeFromManifestKey(key);
    const relativeManifestPath = `server/${appPaths[key].replace(
      /\.js$/,
      "_client-reference-manifest.js",
    )}`;
    const manifestPath = path.join(buildDirectory, relativeManifestPath);
    const manifest = parseClientReferenceManifest(
      await readFile(manifestPath, "utf8"),
      manifestPath,
    );
    const routeJavaScript = Object.values(manifest.entryJSFiles ?? {}).flat();
    const routeCss = Object.values(manifest.entryCSSFiles ?? {})
      .flat()
      .filter(({ inlined }) => !inlined)
      .map(({ path: assetPath }) => assetPath);

    measurements[route] = {
      cssBytes: await assetBytes(buildDirectory, routeCss),
      jsBytes: await assetBytes(buildDirectory, [
        ...sharedJavaScript,
        ...routeJavaScript,
      ]),
    };
  }

  return measurements;
}

export function evaluateRouteBudgets(measurements, baseline) {
  const violations = [];
  const baselineRoutes = baseline.routes ?? {};

  for (const [route, expected] of Object.entries(baselineRoutes)) {
    const actual = measurements[route];

    if (!actual) {
      violations.push({
        asset: "route",
        message: `${route}: route output is missing`,
        route,
      });
      continue;
    }

    for (const [property, asset] of [
      ["cssBytes", "css"],
      ["jsBytes", "js"],
    ]) {
      const allowedBytes = Math.floor(expected[property] * BUDGET_GROWTH_FACTOR);
      if (actual[property] > allowedBytes) {
        violations.push({
          actualBytes: actual[property],
          allowedBytes,
          asset,
          baselineBytes: expected[property],
          message: `${route}: ${asset} is ${actual[property]} bytes (limit ${allowedBytes})`,
          route,
        });
      }
    }
  }

  for (const route of Object.keys(measurements)) {
    if (!baselineRoutes[route]) {
      violations.push({
        asset: "baseline",
        message: `${route}: route does not have a committed baseline`,
        route,
      });
    }
  }

  return violations;
}

function printMeasurements(measurements) {
  for (const [route, sizes] of Object.entries(measurements)) {
    console.log(
      `${route}: js=${sizes.jsBytes} bytes, css=${sizes.cssBytes} bytes`,
    );
  }
}

async function main() {
  const writeBaseline = process.argv.includes("--write-baseline");
  const measurements = await collectRouteBundleMeasurements();

  printMeasurements(measurements);

  if (writeBaseline) {
    const baseline = {
      schemaVersion: 1,
      growthLimitPercent: 5,
      source: "Next.js production client assets (uncompressed bytes)",
      routes: measurements,
    };
    await mkdir(path.dirname(DEFAULT_BASELINE_PATH), { recursive: true });
    await writeFile(
      DEFAULT_BASELINE_PATH,
      `${JSON.stringify(baseline, null, 2)}\n`,
      "utf8",
    );
    console.log(`Wrote ${DEFAULT_BASELINE_PATH}`);
    return;
  }

  const baseline = JSON.parse(
    await readFile(DEFAULT_BASELINE_PATH, "utf8"),
  );
  if (baseline.growthLimitPercent !== 5) {
    throw new Error("The committed route budget must use a five percent limit.");
  }

  const violations = evaluateRouteBudgets(measurements, baseline);
  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(violation.message);
    }
    process.exitCode = 1;
    return;
  }

  console.log("All route JS/CSS bundles are within the five percent budget.");
}

const isMain = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMain) {
  await main();
}
