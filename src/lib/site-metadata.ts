import type { Metadata, MetadataRoute } from "next";

import type { PortfolioSource } from "./content-loader";
import type { PortfolioContentMode } from "./content-readiness";
import type { PortfolioContent, PortfolioProject } from "./portfolio";

type SiteContent = PortfolioSource["site"];

type RouteMetadataInput = {
  description: string;
  path: `/${string}` | "/";
  site: SiteContent;
  title: string;
  type?: "article" | "website";
};

type StructuredData = Record<string, unknown>;

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

export function createSiteStructuredData({
  content,
  siteUrl,
}: {
  content: PortfolioContent;
  siteUrl: URL;
}): StructuredData {
  const personId = absoluteSiteUrl("/#person", siteUrl);
  const websiteId = absoluteSiteUrl("/#website", siteUrl);

  const person: StructuredData = {
    "@id": personId,
    "@type": "Person",
    description: content.profile.summary,
    jobTitle: content.profile.role,
    name: content.profile.name,
    url: absoluteSiteUrl("/", siteUrl),
  };

  if (content.profile.koreanName) {
    person.alternateName = content.profile.koreanName;
  }
  if (content.profile.photo) {
    person.image = absoluteSiteUrl(content.profile.photo.src, siteUrl);
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      person,
      {
        "@id": websiteId,
        "@type": "WebSite",
        author: { "@id": personId },
        description: content.site.description,
        inLanguage: content.site.language,
        name: content.site.brand,
        url: absoluteSiteUrl("/", siteUrl),
      },
    ],
  };
}

export function createProjectStructuredData({
  content,
  project,
  siteUrl,
}: {
  content: PortfolioContent;
  project: PortfolioProject;
  siteUrl: URL;
}): StructuredData {
  const projectPath = `/projects/${project.id}`;

  return {
    "@context": "https://schema.org",
    "@id": `${absoluteSiteUrl(projectPath, siteUrl)}#creative-work`,
    "@type": "CreativeWork",
    author: { "@id": absoluteSiteUrl("/#person", siteUrl) },
    description: project.summary,
    image: absoluteSiteUrl(project.screenshot.src, siteUrl),
    inLanguage: content.site.language,
    keywords: project.tags,
    name: project.title,
    url: absoluteSiteUrl(projectPath, siteUrl),
  };
}

export function serializeStructuredData(data: StructuredData) {
  return JSON.stringify(data)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
}
