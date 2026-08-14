import siteJson from "@/content/site.json";
import { describe, expect, it } from "vitest";

import { getPortfolioContent } from "./portfolio";
import {
  createPortfolioMetadata,
  createRobots,
  createRouteMetadata,
  createSitemap,
} from "./site-metadata";

describe("site indexing metadata", () => {
  it("keeps template sites out of search results", () => {
    const metadata = createPortfolioMetadata({
      mode: "template",
      metadataBase: new URL("http://localhost:3100"),
      site: siteJson,
    });

    expect(metadata.robots).toEqual({ follow: false, index: false });
    expect(createRobots({ mode: "template" })).toEqual({
      rules: { disallow: "/", userAgent: "*" },
    });
  });

  it("indexes a production site from its configured canonical origin", () => {
    const metadataBase = new URL("https://portfolio.example.dev");
    const metadata = createPortfolioMetadata({
      mode: "production",
      metadataBase,
      site: { ...siteJson, socialImage: "/content/social-card.png" },
    });

    expect(metadata.metadataBase).toEqual(metadataBase);
    expect(metadata.alternates).toEqual({ canonical: "/" });
    expect(metadata.robots).toEqual({ follow: true, index: true });
    expect(metadata.openGraph).toEqual(
      expect.objectContaining({
        images: [{ url: "https://portfolio.example.dev/content/social-card.png" }],
      }),
    );
    expect(
      createRobots({ mode: "production", siteUrl: metadataBase }),
    ).toEqual({
      host: "https://portfolio.example.dev",
      rules: { allow: "/", userAgent: "*" },
      sitemap: "https://portfolio.example.dev/sitemap.xml",
    });
  });
});

describe("route metadata", () => {
  it("uses route content while keeping a query-free canonical path", () => {
    const metadata = createRouteMetadata({
      description: "A chronological view of the work.",
      path: "/journey",
      site: siteJson,
      title: "Journey",
    });

    expect(metadata).toEqual(
      expect.objectContaining({
        alternates: { canonical: "/journey" },
        description: "A chronological view of the work.",
        title: "Journey | Your Name",
      }),
    );
    expect(metadata.openGraph).toEqual(
      expect.objectContaining({
        description: "A chronological view of the work.",
        title: "Journey | Your Name",
        url: "/journey",
      }),
    );
  });
});

describe("sitemap", () => {
  it("does not publish template routes", () => {
    expect(
      createSitemap({
        content: getPortfolioContent(),
        mode: "template",
      }),
    ).toEqual([]);
  });

  it("lists enabled pages and project details from the production site URL", () => {
    const content = getPortfolioContent();
    if (!content.site.pages) {
      throw new Error("Sitemap test requires explicit page availability.");
    }
    const sitemap = createSitemap({
      content: {
        ...content,
        site: {
          ...content.site,
          pages: { ...content.site.pages, interviewMap: false },
        },
      },
      mode: "production",
      siteUrl: new URL("https://portfolio.example.dev"),
    });

    expect(sitemap.map(({ url }) => url)).toEqual([
      "https://portfolio.example.dev/",
      "https://portfolio.example.dev/projects",
      `https://portfolio.example.dev/projects/${content.projects[0]?.id}`,
      "https://portfolio.example.dev/about",
      "https://portfolio.example.dev/resume",
      "https://portfolio.example.dev/contact",
      "https://portfolio.example.dev/journey",
    ]);
  });
});
