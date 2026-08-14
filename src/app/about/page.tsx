import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderDesignRoute } from "@/designs/registry";
import { resolvePortfolioPageContext } from "@/lib/portfolio/page-context";
import { createAboutViewModel } from "@/lib/portfolio/view-models";
import {
  getPortfolioContent,
  isSitePageEnabled,
  type RouteSearchParams,
} from "@/lib/portfolio";
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
  const content = getPortfolioContent();
  if (!isSitePageEnabled("about", content)) notFound();

  const { activeTemplate, contentDebug } =
    await resolvePortfolioPageContext({
      content,
      currentPath: "/about",
      searchParams,
    });

  return renderDesignRoute(activeTemplate, {
    contentDebug,
    currentPath: "/about",
    route: "about",
    viewModel: createAboutViewModel(content),
  });
}
