import type { Metadata, MetadataRoute } from "next";

import type { PortfolioSource } from "./content-loader";
import type { PortfolioContentMode } from "./content-readiness";

type SiteContent = PortfolioSource["site"];

type RouteMetadataInput = {
  description: string;
  path: `/${string}` | "/";
  site: SiteContent;
  title: string;
  type?: "article" | "website";
};

function routeTitle(path: string, title: string, site: SiteContent) {
  return path === "/" ? site.title : `${title} | ${site.brand}`;
}

export function createPortfolioMetadata({
  metadataBase,
  mode,
  site,
}: {
  metadataBase: URL;
  mode: PortfolioContentMode;
  site: SiteContent;
}): Metadata {
  const socialImage = site.socialImage
    ? new URL(site.socialImage, metadataBase).toString()
    : undefined;
  const shouldIndex = mode === "production";

  return {
    alternates: { canonical: "/" },
    description: site.description,
    metadataBase,
    openGraph: {
      description: site.description,
      images: socialImage ? [{ url: socialImage }] : undefined,
      title: site.title,
      type: "website",
      url: "/",
    },
    robots: { follow: shouldIndex, index: shouldIndex },
    title: site.title,
    twitter: {
      card: "summary_large_image",
      description: site.description,
      images: socialImage ? [socialImage] : undefined,
      title: site.title,
    },
  };
}

export function createRouteMetadata({
  description,
  path,
  site,
  title,
  type = "website",
}: RouteMetadataInput): Metadata {
  const resolvedTitle = routeTitle(path, title, site);
  const images = site.socialImage
    ? [{ alt: site.title, url: site.socialImage }]
    : undefined;

  return {
    alternates: { canonical: path },
    description,
    openGraph: {
      description,
      images,
      title: resolvedTitle,
      type,
      url: path,
    },
    title: resolvedTitle,
    twitter: {
      card: "summary_large_image",
      description,
      images: site.socialImage ? [site.socialImage] : undefined,
      title: resolvedTitle,
    },
  };
}

export function createRobots({
  mode,
  siteUrl,
}: {
  mode: PortfolioContentMode;
  siteUrl?: URL;
}): MetadataRoute.Robots {
  if (mode === "template") {
    return { rules: { disallow: "/", userAgent: "*" } };
  }

  if (!siteUrl) {
    throw new Error("A production site URL is required to create robots.txt.");
  }

  return {
    host: siteUrl.origin,
    rules: { allow: "/", userAgent: "*" },
  };
}
