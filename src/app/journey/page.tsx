import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ClassicJourneyRoute from "@/designs/classic/journey-route";
import DesignJourneyRoute from "@/designs/design/journey-route";
import { hasDedicatedRouteRenderer, renderDesignRoute } from "@/designs/registry";
import {
  getPortfolioContent,
  isSitePageEnabled,
  type RouteSearchParams,
} from "@/lib/portfolio";
import { resolvePortfolioPageContext } from "@/lib/portfolio/page-context";
import { createJourneyViewModel } from "@/lib/portfolio/view-models";
import { createRouteMetadata } from "@/lib/site-metadata";

export function generateMetadata(): Metadata {
  const content = getPortfolioContent();
  if (!isSitePageEnabled("journey", content)) notFound();

  return createRouteMetadata({
    description: content.journeyNarrative.intro,
    path: "/journey",
    site: content.site,
    title: content.presentation.pages.journey.hero.title,
  });
}

export default async function JourneyPage({
  searchParams,
}: {
  searchParams?: RouteSearchParams;
}) {
  const content = getPortfolioContent();
  if (!isSitePageEnabled("journey", content)) notFound();
  const { activeTemplate, contentDebug } =
    await resolvePortfolioPageContext({
      content,
      currentPath: "/journey",
      searchParams,
    });
  const viewModel = createJourneyViewModel(content);

  if (hasDedicatedRouteRenderer(activeTemplate)) {
    return renderDesignRoute(activeTemplate, {
      contentDebug,
      currentPath: "/journey",
      route: "journey",
      viewModel,
    });
  }

  const JourneyRoute = activeTemplate === "design" ? DesignJourneyRoute : ClassicJourneyRoute;

  return (
    <JourneyRoute
      content={viewModel}
      contentDebug={contentDebug}
      currentPath="/journey"
      route="journey"
    />
  );
}
