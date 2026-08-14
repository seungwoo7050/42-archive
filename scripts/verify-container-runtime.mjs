import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

const suffix = `${process.pid}-${randomBytes(4).toString("hex")}`;
const imageName = `portfolio-runtime-test:${suffix}`;
const containerName = `portfolio-runtime-test-${suffix}`;
const contentDirectory = path.join(process.cwd(), "src/content");
const mimeByExtension = new Map([
  [".avif", "image/avif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);

async function docker(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, {
      cwd: process.cwd(),
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stderr = "";
    let stdout = "";

    if (options.capture) {
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
    }

    child.on("error", reject);
    child.on("close", (exitCode) => {
      if (exitCode !== 0) {
        reject(
          new Error(
            `docker ${args.join(" ")} exited ${exitCode}${stderr ? `: ${stderr.trim()}` : ""}`,
          ),
        );
        return;
      }
      resolve(stdout.trim());
    });
  });
}

function collectAssetPaths(value, assets) {
  if (typeof value === "string") {
    if (/^\/(content|template)\//.test(value)) {
      assets.add(value);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectAssetPaths(item, assets);
    return;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectAssetPaths(item, assets);
  }
}

async function discoverAssets() {
  const assets = new Set();

  for (const filename of (await readdir(contentDirectory)).sort()) {
    if (!filename.endsWith(".json")) continue;
    collectAssetPaths(
      JSON.parse(await readFile(path.join(contentDirectory, filename), "utf8")),
      assets,
    );
  }

  return [...assets].sort();
}

async function waitUntilReady(baseUrl) {
  let lastError;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
      lastError = new Error(`readiness returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(1_000);
  }

  throw new Error(`container did not become ready: ${lastError}`);
}

async function verifyResponse(baseUrl, pathname, expectedMime) {
  const response = await fetch(new URL(pathname, baseUrl));
  const body = new Uint8Array(await response.arrayBuffer());
  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();

  if (response.status !== 200) {
    throw new Error(`${pathname}: expected 200, received ${response.status}`);
  }
  if (body.byteLength === 0) {
    throw new Error(`${pathname}: response body is empty`);
  }
  if (expectedMime && !contentType.includes(expectedMime)) {
    throw new Error(
      `${pathname}: expected ${expectedMime}, received ${contentType || "none"}`,
    );
  }
}

let containerStarted = false;
let failed = false;

try {
  const assets = await discoverAssets();
  if (assets.length === 0) {
    throw new Error("content JSON did not reference a public asset");
  }

  await docker(["build", "--tag", imageName, "."]);
  await docker([
    "run",
    "--detach",
    "--name",
    containerName,
    "--publish",
    "127.0.0.1::3100",
    imageName,
  ]);
  containerStarted = true;

  const publishedPort = await docker(
    ["port", containerName, "3100/tcp"],
    { capture: true },
  );
  const port = publishedPort.match(/:(\d+)\s*$/)?.[1];
  if (!port) throw new Error(`cannot parse published port: ${publishedPort}`);

  const baseUrl = `http://127.0.0.1:${port}`;
  await waitUntilReady(baseUrl);

  const user = await docker(
    ["inspect", "--format", "{{.Config.User}}", containerName],
    { capture: true },
  );
  if (user !== "node") {
    throw new Error(`container must run as node, received ${user || "root"}`);
  }

  await verifyResponse(baseUrl, "/", "text/html");
  await verifyResponse(
    baseUrl,
    "/projects/example-project?view=classic",
    "text/html",
  );

  for (const asset of assets) {
    const extension = path.extname(new URL(asset, baseUrl).pathname).toLowerCase();
    const expectedMime = mimeByExtension.get(extension);
    if (!expectedMime) {
      throw new Error(`${asset}: unsupported MIME contract for ${extension}`);
    }
    await verifyResponse(baseUrl, asset, expectedMime);
  }

  console.log(
    `verified non-root container, 2 routes, and ${assets.length} content assets`,
  );
} catch (error) {
  failed = true;
  if (containerStarted) {
    try {
      await docker(["logs", containerName]);
    } catch {}
  }
  throw error;
} finally {
  if (containerStarted) {
    try {
      await docker(["rm", "--force", containerName], { capture: true });
    } catch (error) {
      if (!failed) throw error;
    }
  }
  try {
    await docker(["image", "rm", "--force", imageName], { capture: true });
  } catch (error) {
    if (!failed) throw error;
  }
}
