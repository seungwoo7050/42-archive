import { notFound } from "next/navigation";
import { ProjectDetailView } from "@/components/portfolio/project-detail-view";
import { PageShell } from "@/components/portfolio/site-shell";
import { hasDedicatedRouteRenderer, renderDesignRoute } from "@/designs/registry";
import {
  getPortfolioContent,
  isSitePageEnabled,
  getProjectById,
  resolveContentDebug,
  resolveHomeTemplateId,
  type RouteSearchParams,
} from "@/lib/portfolio";

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
  const query = searchParams ? await searchParams : {};
  const activeTemplate = resolveHomeTemplateId(query.view, content.presentation);
  const contentDebug = resolveContentDebug(query.debug);
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
    <PageShell
      contentDebug={contentDebug}
      homeTemplate={activeTemplate}
      profile={content.profile}
      site={content.site}
      ui={content.presentation.ui}
      templateSwitcher={{
        activeId: activeTemplate,
        contentDebug,
        currentPath: `/projects/${project.id}`,
        templates: content.presentation.templates,
      }}
    >
      <ProjectDetailView
        contentDebug={contentDebug}
        homeTemplate={activeTemplate}
        pageCopy={content.presentation.pages.projectDetail}
        project={project}
      />
    </PageShell>
  );
}
