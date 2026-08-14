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
