import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ClassicAboutRoute from "@/designs/classic/about-route";
import DesignAboutRoute from "@/designs/design/about-route";
import { hasDedicatedRouteRenderer, renderDesignRoute } from "@/designs/registry";
import {
  getPortfolioContent,
  isSitePageEnabled,
  type RouteSearchParams,
} from "@/lib/portfolio";
import { resolvePortfolioPageContext } from "@/lib/portfolio/page-context";
import { createAboutViewModel } from "@/lib/portfolio/view-models";
import { createRouteMetadata } from "@/lib/site-metadata";

export function generateMetadata(): Metadata {
  const content = getPortfolioContent();
  if (!isSitePageEnabled("about", content)) notFound();

  return createRouteMetadata({
    description: content.profile.summary,
    path: "/about",
    site: content.site,
    title: content.presentation.pages.about.hero.title,
  });
}

export default async function AboutPage({
  searchParams,
}: {
  searchParams?: RouteSearchParams;
}) {
  const contentSource = getPortfolioContent();
  if (!isSitePageEnabled("about", contentSource)) notFound();
  const { activeTemplate, contentDebug } =
    await resolvePortfolioPageContext({
      content: contentSource,
      currentPath: "/about",
      searchParams,
    });
  const content = createAboutViewModel(contentSource);

  if (hasDedicatedRouteRenderer(activeTemplate)) {
    return renderDesignRoute(activeTemplate, {
      contentDebug,
      currentPath: "/about",
      route: "about",
      viewModel: content,
    });
  }

  const AboutRoute = activeTemplate === "design" ? DesignAboutRoute : ClassicAboutRoute;

  return (
    <AboutRoute
      content={content}
      contentDebug={contentDebug}
      currentPath="/about"
      route="about"
    />
  );
}
