import type { Metadata, MetadataRoute } from "next";

import type { PortfolioSource } from "./content-loader";
import type { PortfolioContentMode } from "./content-readiness";
import type { PortfolioContent } from "./portfolio";

type SiteContent = PortfolioSource["site"];

type RouteMetadataInput = {
  description: string;
  path: `/${string}` | "/";
  site: SiteContent;
  title: string;
  type?: "article" | "website";
};

function absoluteSiteUrl(path: string, siteUrl: URL) {
  return new URL(path, siteUrl.origin).toString();
}

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
    sitemap: absoluteSiteUrl("/sitemap.xml", siteUrl),
  };
}

export function createSitemap({
  content,
  mode,
  siteUrl,
}: {
  content: PortfolioContent;
  mode: PortfolioContentMode;
  siteUrl?: URL;
}): MetadataRoute.Sitemap {
  if (mode === "template") {
    return [];
  }

  if (!siteUrl) {
    throw new Error("A production site URL is required to create sitemap.xml.");
  }

  const routes = ["/"];
  const pages = content.site.pages;

  if (pages?.projects !== false) {
    routes.push("/projects");
    routes.push(...content.projects.map(({ id }) => `/projects/${id}`));
  }
  if (pages?.about !== false) routes.push("/about");
  if (pages?.resume !== false) routes.push("/resume");
  if (pages?.contact !== false) routes.push("/contact");
  if (pages?.journey !== false) routes.push("/journey");
  if (pages?.interviewMap !== false) routes.push("/interview-map");

  return routes.map((path) => ({ url: absoluteSiteUrl(path, siteUrl) }));
}
