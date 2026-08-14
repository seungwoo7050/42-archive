import { loadPortfolioSource } from "@/lib/content-loader";
import { describe, expect, it } from "vitest";

import {
  PortfolioReadinessError,
  resolvePortfolioContentMode,
  validateBuildReadiness,
  validateProductionReadiness,
} from "./content-readiness";

function captureReadinessError(run: () => unknown) {
  let caught: unknown;

  try {
    run();
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(PortfolioReadinessError);
  return caught as PortfolioReadinessError;
}

function replaceTemplateMarkers(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replaceAll("Your Name", "Portfolio Owner")
      .replaceAll("your-handle", "portfolio-owner")
      .replaceAll("Your City", "Seoul")
      .replaceAll("Your Program or Practice", "Software Engineering Program")
      .replaceAll("hello@example.com", "owner@portfolio.dev")
      .replaceAll("Example Project", "Realtime Collaboration Project")
      .replaceAll("example-project", "realtime-collaboration")
      .replaceAll("placeholder", "preview")
      .replaceAll("Placeholder", "Preview")
      .replaceAll("starter", "published")
      .replaceAll("Replace this", "This section contains")
      .replaceAll("Replace the", "Update the")
      .replace("/template/", "/content/");
  }

  if (Array.isArray(value)) {
    return value.map(replaceTemplateMarkers);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        replaceTemplateMarkers(item),
      ]),
    );
  }

  return value;
}

function createProductionReadyContent() {
  const content = replaceTemplateMarkers(
    structuredClone(loadPortfolioSource()),
  ) as ReturnType<typeof loadPortfolioSource>;

  content.site.socialImage = "/content/social-card.png";
  content.profile.photo = {
    src: "/content/profile/portrait.png",
    alt: "Portfolio Owner portrait",
  };
  content.resume.downloadUrl = "/content/resume/portfolio-owner.pdf";
  content.projects.items[0].links[0] = {
    ...content.projects.items[0].links[0],
    enabled: true,
    href: "https://github.com/portfolio-owner/realtime-collaboration",
    label: "Source",
  };

  return content;
}

describe("portfolio production readiness", () => {
  it("defaults to template mode and rejects unsupported values", () => {
    expect(resolvePortfolioContentMode(undefined)).toBe("template");
    expect(resolvePortfolioContentMode("template")).toBe("template");
    expect(resolvePortfolioContentMode("production")).toBe("production");

    expect(() => resolvePortfolioContentMode("preview")).toThrow(
      /PORTFOLIO_CONTENT_MODE.*template.*production/,
    );
  });

  it("allows the checked-in placeholders in template mode", () => {
    const result = validateBuildReadiness(loadPortfolioSource(), {
      PORTFOLIO_CONTENT_MODE: "template",
    });

    expect(result).toEqual({ mode: "template", siteUrl: undefined });
  });

  it("reports every production input category without masking later issues", () => {
    const error = captureReadinessError(() =>
      validateBuildReadiness(loadPortfolioSource(), {
        PORTFOLIO_CONTENT_MODE: "production",
      }),
    );

    expect(error.message).toContain("Portfolio production readiness failed");
    expect(error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "SITE_URL" }),
        expect.objectContaining({ path: "$.socialImage" }),
        expect.objectContaining({ path: "$.name" }),
        expect.objectContaining({ path: "$.photo.src" }),
        expect.objectContaining({ path: "$[0].href" }),
        expect.objectContaining({ path: "$.downloadUrl" }),
        expect.objectContaining({
          path: "$.items[0].screenshot.src",
        }),
        expect.objectContaining({ path: "$.items[0].links" }),
      ]),
    );
  });

  it("accepts complete content and a valid public site URL", () => {
    const content = createProductionReadyContent();

    expect(
      validateProductionReadiness(content, {
        SITE_URL: "https://portfolio.example.dev",
      }),
    ).toEqual({
      mode: "production",
      siteUrl: new URL("https://portfolio.example.dev"),
    });
  });

  it("rejects local and malformed production site URLs", () => {
    for (const siteUrl of [
      "not-a-url",
      "ftp://portfolio.example.dev",
      "http://localhost:3100",
      "https://example.com",
    ]) {
      const error = captureReadinessError(() =>
        validateProductionReadiness(createProductionReadyContent(), {
          SITE_URL: siteUrl,
        }),
      );

      expect(error.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: "SITE_URL" })]),
      );
    }
  });
});
