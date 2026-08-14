import type { Metadata } from "next";
import { PageShell } from "@/components/portfolio/site-shell";
import { notFound } from "next/navigation";
import { ClassicProjectsView } from "@/designs/classic/projects/projects-route";
import { DesignProjectsView } from "@/designs/design/projects/projects-route";
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
  const { activeTemplate, contentDebug, shellProps } =
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
  const pageCopy = viewModel.presentation.pages.projects;
  const featuredProjects = viewModel.featuredProjects;
  const groupedProjects = viewModel.archiveGroupEntries;
  const sourceOnlyCount = viewModel.metricValues.sourceOnlyCount ?? 0;
  const curriculumCount = viewModel.metricValues.curriculumCount ?? 0;
  if (activeTemplate === "classic") {
    return (
      <PageShell {...shellProps}>
        <ClassicProjectsView
          activeTemplate={activeTemplate}
          contentDebug={contentDebug}
          curriculumCount={curriculumCount}
          featuredProjects={featuredProjects}
          groupedProjects={groupedProjects}
          pageCopy={pageCopy}
          projects={viewModel.projects}
          sourceOnlyCount={sourceOnlyCount}
        />
      </PageShell>
    );
  }

  return (
    <PageShell {...shellProps}>
      <DesignProjectsView
        activeTemplate={activeTemplate}
        contentDebug={contentDebug}
        curriculumCount={curriculumCount}
        featuredProjects={featuredProjects}
        groupedProjects={groupedProjects}
        pageCopy={pageCopy}
        projects={viewModel.projects}
        sourceOnlyCount={sourceOnlyCount}
      />
    </PageShell>
  );
}
