import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const INPUT_DIRECTORY = ".lighthouseci";
const OUTPUT_PATH = "performance/lighthouse-baseline.json";

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function resultFromReport(report) {
  return {
    accessibilityScore: report.categories.accessibility.score * 100,
    cls: report.audits["cumulative-layout-shift"].numericValue,
    lcpMs: report.audits["largest-contentful-paint"].numericValue,
    performanceScore: report.categories.performance.score * 100,
    tbtMs: report.audits["total-blocking-time"].numericValue,
  };
}

function aggregate(results) {
  return {
    accessibilityScore: median(
      results.map(({ accessibilityScore }) => accessibilityScore),
    ),
    cls: median(results.map(({ cls }) => cls)),
    lcpMs: median(results.map(({ lcpMs }) => lcpMs)),
    performanceScore: median(
      results.map(({ performanceScore }) => performanceScore),
    ),
    tbtMs: median(results.map(({ tbtMs }) => tbtMs)),
  };
}

async function main() {
  const filenames = (await readdir(INPUT_DIRECTORY)).filter(
    (filename) => filename.startsWith("lhr-") && filename.endsWith(".json"),
  );
  if (filenames.length === 0) {
    throw new Error("No Lighthouse JSON reports were found in .lighthouseci.");
  }

  const reports = await Promise.all(
    filenames.map(async (filename) =>
      JSON.parse(
        await readFile(path.join(INPUT_DIRECTORY, filename), "utf8"),
      ),
    ),
  );
  const grouped = new Map();

  for (const report of reports) {
    const url = report.finalUrl;
    const results = grouped.get(url) ?? [];
    results.push(resultFromReport(report));
    grouped.set(url, results);
  }

  const routes = Object.fromEntries(
    [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([url, runs]) => [url, { median: aggregate(runs), runs }]),
  );
  const firstReport = reports[0];
  const summary = {
    schemaVersion: 1,
    measuredAt: new Date().toISOString(),
    measurement: {
      kind: "Lighthouse desktop lab run against the local production server",
      runCountPerUrl: 3,
      aggregation: "median",
      interactionProxy: "total-blocking-time",
    },
    targets: {
      accessibilityScore: 95,
      cls: 0.1,
      lcpMs: 2_500,
      performanceScore: 90,
      tbtMs: 200,
    },
    environment: {
      arch: os.arch(),
      chromeUserAgent: firstReport.environment.hostUserAgent,
      cpu: os.cpus()[0]?.model ?? "unknown",
      logicalCpuCount: os.cpus().length,
      memoryBytes: os.totalmem(),
      node: process.version,
      platform: os.platform(),
    },
    routes,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(`Wrote ${OUTPUT_PATH} from ${reports.length} Lighthouse runs.`);
}

await main();
