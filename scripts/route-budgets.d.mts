export type RouteBundleSize = {
  cssBytes: number;
  jsBytes: number;
};

export type RouteBundleMeasurement = Record<string, RouteBundleSize>;

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
