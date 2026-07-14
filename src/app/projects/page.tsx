import { PageShell } from "@/components/portfolio/site-shell";
import { notFound } from "next/navigation";
import { ClassicProjectsView } from "@/designs/classic/projects/projects-route";
import { DesignProjectsView } from "@/designs/design/projects/projects-route";
import { hasDedicatedRouteRenderer, renderDesignRoute } from "@/designs/registry";
import {
  getPortfolioContent,
  isSitePageEnabled,
  getProjectMetricValue,
  type RouteSearchParams,
} from "@/lib/portfolio";
import { resolvePortfolioPageContext } from "@/lib/portfolio/page-context";
import { groupProjects } from "@/lib/portfolio/project-groups";

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

  if (hasDedicatedRouteRenderer(activeTemplate)) {
    return renderDesignRoute(activeTemplate, {
      content,
      contentDebug,
      currentPath: "/projects",
      route: "projects",
    });
  }
  const pageCopy = content.presentation.pages.projects;
  const featuredProjects = content.projects.filter((project) => project.featured);
  const trackProjects = content.projects.filter((project) => !project.featured);
  const groupedProjects = groupProjects(trackProjects, pageCopy.groups);
  const sourceOnlyCount = getProjectMetricValue("sourceOnlyCount", content);
  const curriculumCount = getProjectMetricValue("curriculumCount", content);
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
          projects={content.projects}
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
        projects={content.projects}
        sourceOnlyCount={sourceOnlyCount}
      />
    </PageShell>
  );
}
