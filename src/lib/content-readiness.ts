import type { PortfolioSource } from "./content-loader";

export type PortfolioContentMode = "template" | "production";

export type PortfolioReadinessEnvironment = {
  PORTFOLIO_CONTENT_MODE?: string;
  SITE_URL?: string;
};

export type PortfolioReadinessIssue = {
  file: string;
  path: string;
  message: string;
};

export type PortfolioReadinessResult =
  | { mode: "template"; siteUrl: undefined }
  | { mode: "production"; siteUrl: URL };

type ProductionReadinessResult = Extract<
  PortfolioReadinessResult,
  { mode: "production" }
>;

export const contentFiles = [
  ["site", "src/content/site.json"],
  ["profile", "src/content/profile.json"],
  ["projects", "src/content/projects.json"],
  ["presentation", "src/content/presentation.json"],
  ["skills", "src/content/skills.json"],
  ["techStack", "src/content/tech-stack.json"],
  ["experience", "src/content/experience.json"],
  ["journey", "src/content/journey.json"],
  ["journeyNarrative", "src/content/journey-narrative.json"],
  ["interviewMap", "src/content/interview-map.json"],
  ["curation", "src/content/curation.json"],
  ["links", "src/content/links.json"],
  ["contact", "src/content/contact.json"],
  ["resume", "src/content/resume.json"],
] as const satisfies ReadonlyArray<
  readonly [keyof PortfolioSource, `src/content/${string}.json`]
>;

export const placeholderMarkers = [
  { label: "Your Name", pattern: /\byour name\b/i },
  { label: "your-handle", pattern: /\byour-handle\b/i },
  { label: "Your City", pattern: /\byour city\b/i },
  {
    label: "Your Program or Practice",
    pattern: /\byour program(?: or practice)?\b/i,
  },
  { label: "hello@example.com", pattern: /\bhello@example\.com\b/i },
  { label: "Example Project", pattern: /\bexample[- ]project\b/i },
  { label: "placeholder", pattern: /\bplaceholder\b/i },
  { label: "Replace this/the", pattern: /\breplace (?:this|the)\b/i },
  { label: "starter", pattern: /\bstarter\b/i },
] as const;

export class PortfolioReadinessError extends Error {
  readonly issues: PortfolioReadinessIssue[];

  constructor(issues: PortfolioReadinessIssue[]) {
    const details = issues
      .map(({ file, path, message }) => `- ${file}:${path} ${message}`)
      .join("\n");

    super(`Portfolio production readiness failed:\n${details}`);
    this.name = "PortfolioReadinessError";
    this.issues = issues;
  }
}

export function resolvePortfolioContentMode(
  value: string | undefined,
): PortfolioContentMode {
  if (value === undefined || value === "" || value === "template") {
    return "template";
  }

  if (value === "production") {
    return "production";
  }

  throw new Error(
    `PORTFOLIO_CONTENT_MODE must be "template" or "production"; received ${JSON.stringify(value)}.`,
  );
}

export function appendPath(path: string, key: string | number) {
  if (typeof key === "number") {
    return `${path}[${key}]`;
  }

  return /^[a-zA-Z_$][\w$]*$/.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(key)}]`;
}

export function findPlaceholderMarker(value: string) {
  return placeholderMarkers.find(({ pattern }) => pattern.test(value));
}

export function collectPlaceholderIssues(
  value: unknown,
  file: string,
  path: string,
  issues: PortfolioReadinessIssue[],
) {
  if (typeof value === "string") {
    const marker = findPlaceholderMarker(value);
    if (marker) {
      issues.push({
        file,
        path,
        message: `Replace the template marker "${marker.label}" with production content.`,
      });
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectPlaceholderIssues(item, file, appendPath(path, index), issues),
    );
    return;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) =>
      collectPlaceholderIssues(item, file, appendPath(path, key), issues),
    );
  }
}

export function addProductionAssetIssue(
  issues: PortfolioReadinessIssue[],
  file: string,
  path: string,
  assetPath: string,
) {
  if (!assetPath.startsWith("/content/")) {
    issues.push({
      file,
      path,
      message: `Use a production asset under public/content instead of "${assetPath}".`,
    });
  }
}

export function isReservedHostname(hostname: string) {
  return (
    ["example.com", "example.net", "example.org"].some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    ) ||
    [".example", ".invalid", ".test"].some((suffix) =>
      hostname.endsWith(suffix),
    )
  );
}

export function parsePublicSiteUrl(
  value: string | undefined,
  issues: PortfolioReadinessIssue[],
) {
  if (!value) {
    issues.push({
      file: "environment",
      path: "SITE_URL",
      message: "SITE_URL is required in production content mode.",
    });
    return undefined;
  }

  let siteUrl: URL;
  try {
    siteUrl = new URL(value);
  } catch {
    issues.push({
      file: "environment",
      path: "SITE_URL",
      message: "SITE_URL must be an absolute http(s) URL.",
    });
    return undefined;
  }

  const hostname = siteUrl.hostname.toLowerCase();
  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost");

  if (
    !["http:", "https:"].includes(siteUrl.protocol) ||
    isLocal ||
    isReservedHostname(hostname) ||
    siteUrl.username !== "" ||
    siteUrl.password !== ""
  ) {
    issues.push({
      file: "environment",
      path: "SITE_URL",
      message:
        "SITE_URL must use a real public http(s) origin, not a local or placeholder address.",
    });
    return undefined;
  }

  return siteUrl;
}

export function resolveProductionSiteUrl(value: string | undefined) {
  const issues: PortfolioReadinessIssue[] = [];
  const siteUrl = parsePublicSiteUrl(value, issues);

  if (!siteUrl || issues.length > 0) {
    throw new PortfolioReadinessError(issues);
  }

  return siteUrl;
}

export function isUsablePublicUrl(href: string) {
  if (findPlaceholderMarker(href)) {
    return false;
  }

  try {
    const url = new URL(href);
    const hostname = url.hostname.toLowerCase();

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !isReservedHostname(hostname)
    );
  } catch {
    return false;
  }
}

export function isUsableContactHref(href: string) {
  if (findPlaceholderMarker(href)) {
    return false;
  }

  return (
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    isUsablePublicUrl(href)
  );
}

export function validateProductionReadiness(
  content: PortfolioSource,
  environment: Pick<PortfolioReadinessEnvironment, "SITE_URL">,
): ProductionReadinessResult {
  const issues: PortfolioReadinessIssue[] = [];
  const siteUrl = parsePublicSiteUrl(environment.SITE_URL, issues);

  for (const [key, file] of contentFiles) {
    collectPlaceholderIssues(content[key], file, "$", issues);
  }

  if (!content.site.socialImage) {
    issues.push({
      file: "src/content/site.json",
      path: "$.socialImage",
      message: "Add a social image under public/content for production.",
    });
  } else {
    addProductionAssetIssue(
      issues,
      "src/content/site.json",
      "$.socialImage",
      content.site.socialImage,
    );
  }

  if (!content.profile.photo) {
    issues.push({
      file: "src/content/profile.json",
      path: "$.photo",
      message: "Add a profile image under public/content for production.",
    });
  } else {
    addProductionAssetIssue(
      issues,
      "src/content/profile.json",
      "$.photo.src",
      content.profile.photo.src,
    );
  }

  if (!content.resume.downloadUrl) {
    issues.push({
      file: "src/content/resume.json",
      path: "$.downloadUrl",
      message: "Add a downloadable resume under public/content for production.",
    });
  } else {
    addProductionAssetIssue(
      issues,
      "src/content/resume.json",
      "$.downloadUrl",
      content.resume.downloadUrl,
    );
  }

  const enabledProjects = content.projects.items.filter(
    (project) => project.enabled !== false,
  );

  if (enabledProjects.length === 0) {
    issues.push({
      file: "src/content/projects.json",
      path: "$.items",
      message: "Enable at least one real project for production.",
    });
  }

  content.projects.items.forEach((project, projectIndex) => {
    if (project.enabled === false) {
      return;
    }

    addProductionAssetIssue(
      issues,
      "src/content/projects.json",
      `$.items[${projectIndex}].screenshot.src`,
      project.screenshot.src,
    );
    project.screenshots.forEach((screenshot, screenshotIndex) =>
      addProductionAssetIssue(
        issues,
        "src/content/projects.json",
        `$.items[${projectIndex}].screenshots[${screenshotIndex}].src`,
        screenshot.src,
      ),
    );

    if (
      !project.links.some(
        (link) => link.enabled !== false && isUsablePublicUrl(link.href),
      )
    ) {
      issues.push({
        file: "src/content/projects.json",
        path: `$.items[${projectIndex}].links`,
        message: "Add at least one enabled public project URL for production.",
      });
    }
  });
  if (!siteUrl || issues.length > 0) {
    throw new PortfolioReadinessError(issues);
  }

  return { mode: "production", siteUrl };
}
