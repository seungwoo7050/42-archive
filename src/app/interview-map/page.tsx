import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ClassicInterviewMapRoute from "@/designs/classic/interview-map-route";
import DesignInterviewMapRoute from "@/designs/design/interview-map-route";
import { hasDedicatedRouteRenderer, renderDesignRoute } from "@/designs/registry";
import {
  getPortfolioContent,
  isSitePageEnabled,
  type RouteSearchParams,
} from "@/lib/portfolio";
import { resolvePortfolioPageContext } from "@/lib/portfolio/page-context";
import { createInterviewMapViewModel } from "@/lib/portfolio/view-models";
import { createRouteMetadata } from "@/lib/site-metadata";

export function generateMetadata(): Metadata {
  const content = getPortfolioContent();
  if (!isSitePageEnabled("interviewMap", content)) notFound();

  return createRouteMetadata({
    description: content.interviewMap.intro,
    path: "/interview-map",
    site: content.site,
    title: content.presentation.pages.interviewMap.hero.title,
  });
}

export default async function InterviewMapPage({
  searchParams,
}: {
  searchParams?: RouteSearchParams;
}) {
  const content = getPortfolioContent();
  if (!isSitePageEnabled("interviewMap", content)) notFound();
  const { activeTemplate, contentDebug } =
    await resolvePortfolioPageContext({
      content,
      currentPath: "/interview-map",
      searchParams,
    });

  if (hasDedicatedRouteRenderer(activeTemplate)) {
    return renderDesignRoute(activeTemplate, {
      content,
      contentDebug,
      currentPath: "/interview-map",
      route: "interview-map",
    });
  }

  const viewModel = createInterviewMapViewModel(content);
  const InterviewMapRoute =
    activeTemplate === "design" ? DesignInterviewMapRoute : ClassicInterviewMapRoute;

  return (
    <InterviewMapRoute
      content={viewModel}
      contentDebug={contentDebug}
      currentPath="/interview-map"
      route="interview-map"
    />
  );
}
