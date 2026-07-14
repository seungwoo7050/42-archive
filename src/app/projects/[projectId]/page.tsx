import { notFound } from "next/navigation";
import { ProjectDetailView } from "@/components/portfolio/project-detail-view";
import { PageShell } from "@/components/portfolio/site-shell";
import { hasDedicatedRouteRenderer, renderDesignRoute } from "@/designs/registry";
import {
  getPortfolioContent,
  isSitePageEnabled,
  getProjectById,
  type RouteSearchParams,
} from "@/lib/portfolio";
import { resolvePortfolioPageContext } from "@/lib/portfolio/page-context";

export function generateStaticParams() {
  return getPortfolioContent().projects.map((project) => ({
    projectId: project.id,
  }));
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams?: RouteSearchParams;
}) {
  const content = getPortfolioContent();
  if (!isSitePageEnabled("projects", content)) notFound();
  const { projectId } = await params;
  const { activeTemplate, contentDebug, shellProps } =
    await resolvePortfolioPageContext({
      content,
      currentPath: `/projects/${projectId}`,
      searchParams,
    });
  const project = getProjectById(projectId, content);

  if (!project) {
    notFound();
  }

  if (hasDedicatedRouteRenderer(activeTemplate)) {
    return renderDesignRoute(activeTemplate, {
      content,
      contentDebug,
      currentPath: `/projects/${project.id}`,
      project,
      route: "project-detail",
    });
  }

  return (
    <PageShell {...shellProps}>
      <ProjectDetailView
        contentDebug={contentDebug}
        homeTemplate={activeTemplate}
        pageCopy={content.presentation.pages.projectDetail}
        project={project}
      />
    </PageShell>
  );
}
