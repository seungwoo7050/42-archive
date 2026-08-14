import { existsSync } from "node:fs";
import { resolve } from "node:path";

const requiredArtifacts = [
  ".next/standalone/server.js",
  ".next/static"
];

const missing = requiredArtifacts.filter((artifact) => !existsSync(resolve(artifact)));

if (missing.length > 0) {
  throw new Error(`Standalone build output is incomplete:\n${missing.map((artifact) => `- ${artifact}`).join("\n")}`);
}

console.log(`verified ${requiredArtifacts.length} portfolio build artifacts`);
