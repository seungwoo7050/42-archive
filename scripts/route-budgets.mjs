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
