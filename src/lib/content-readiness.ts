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
