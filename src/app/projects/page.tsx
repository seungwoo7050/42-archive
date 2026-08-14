import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ClassicProjectsRoute from "@/designs/classic/projects-route";
import DesignProjectsRoute from "@/designs/design/projects-route";
import { hasDedicatedRouteRenderer, renderDesignRoute } from "@/designs/registry";
import {
  getPortfolioContent,
  isSitePageEnabled,
  type RouteSearchParams,
} from "@/lib/portfolio";
import { resolvePortfolioPageContext } from "@/lib/portfolio/page-context";
import { createProjectIndexViewModel } from "@/lib/portfolio/view-models";
import { createRouteMetadata } from "@/lib/site-metadata";

export function generateMetadata(): Metadata {
  const content = getPortfolioContent();
  if (!isSitePageEnabled("projects", content)) notFound();
  const hero = content.presentation.pages.projects.design.hero;

  return createRouteMetadata({
    description: hero.body,
    path: "/projects",
    site: content.site,
    title: hero.title,
  });
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: RouteSearchParams;
}) {
  const content = getPortfolioContent();
  if (!isSitePageEnabled("projects", content)) notFound();
  const { activeTemplate, contentDebug } =
    await resolvePortfolioPageContext({
      content,
      currentPath: "/projects",
      searchParams,
    });
  const viewModel = createProjectIndexViewModel(content);

  if (hasDedicatedRouteRenderer(activeTemplate)) {
    return renderDesignRoute(activeTemplate, {
      contentDebug,
      currentPath: "/projects",
      route: "projects",
      viewModel,
    });
  }

  if (activeTemplate === "classic") {
    return (
      <ClassicProjectsRoute
        content={viewModel}
        contentDebug={contentDebug}
        currentPath="/projects"
        route="projects"
      />
    );
  }

  return (
    <DesignProjectsRoute
      content={viewModel}
      contentDebug={contentDebug}
      currentPath="/projects"
      route="projects"
    />
  );
}
