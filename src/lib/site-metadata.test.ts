import siteJson from "@/content/site.json";
import { describe, expect, it } from "vitest";

import { createPortfolioMetadata, createRobots } from "./site-metadata";

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
