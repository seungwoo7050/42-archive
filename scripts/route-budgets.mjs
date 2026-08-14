import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export const BUDGET_GROWTH_FACTOR = 1.05;

const DEFAULT_BUILD_DIRECTORY = ".next";

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
