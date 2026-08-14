export const BUDGET_GROWTH_FACTOR: 1.05;

export type RouteBundleSize = {
  cssBytes: number;
  jsBytes: number;
};

export type RouteBundleMeasurement = Record<string, RouteBundleSize>;

export type RouteBudgetBaseline = {
  schemaVersion: 1;
  growthLimitPercent: 5;
  routes: RouteBundleMeasurement;
};

export type RouteBudgetViolation = {
  actualBytes?: number;
  allowedBytes?: number;
  asset: "baseline" | "css" | "js" | "route";
  baselineBytes?: number;
  message: string;
  route: string;
};

export type ClientReferenceManifest = {
  entryCSSFiles?: Record<
    string,
    Array<{ inlined: boolean; path: string }>
  >;
  entryJSFiles?: Record<string, string[]>;
};

export function parseClientReferenceManifest(
  source: string,
  filename: string,
): ClientReferenceManifest;

export function collectRouteBundleMeasurements(
  buildDirectory?: string,
): Promise<RouteBundleMeasurement>;

export function evaluateRouteBudgets(
  measurements: RouteBundleMeasurement,
  baseline: RouteBudgetBaseline,
): RouteBudgetViolation[];
