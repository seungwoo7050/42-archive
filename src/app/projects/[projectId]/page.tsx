import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailView } from "@/components/portfolio/project-detail-view";
import { PageShell } from "@/components/portfolio/site-shell";
import { StructuredData } from "@/components/portfolio/structured-data";
import { hasDedicatedRouteRenderer, renderDesignRoute } from "@/designs/registry";
import {
  resolvePortfolioContentMode,
  resolveProductionSiteUrl,
} from "@/lib/content-readiness";
import {
  getPortfolioContent,
  isSitePageEnabled,
  getProjectById,
  type RouteSearchParams,
} from "@/lib/portfolio";
import { resolvePortfolioPageContext } from "@/lib/portfolio/page-context";
import {
  createProjectStructuredData,
  createRouteMetadata,
} from "@/lib/site-metadata";

type ProjectDetailPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams?: RouteSearchParams;
};

export function generateStaticParams() {
  return getPortfolioContent().projects.map((project) => ({
    projectId: project.id,
  }));
}

export async function generateMetadata({
  params,
}: Pick<ProjectDetailPageProps, "params">): Promise<Metadata> {
  const content = getPortfolioContent();
  const { projectId } = await params;
  const project = getProjectById(projectId, content);

  if (!isSitePageEnabled("projects", content) || !project) {
    notFound();
  }

  return createRouteMetadata({
    description: project.summary,
    path: `/projects/${project.id}`,
    site: content.site,
    title: project.title,
    type: "article",
  });
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: ProjectDetailPageProps) {
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

  const mode = resolvePortfolioContentMode(
    process.env.PORTFOLIO_CONTENT_MODE,
  );
  const structuredData =
    mode === "production"
      ? createProjectStructuredData({
          content,
          project,
          siteUrl: resolveProductionSiteUrl(process.env.SITE_URL),
        })
      : undefined;

  if (hasDedicatedRouteRenderer(activeTemplate)) {
    return (
      <>
        {structuredData ? <StructuredData data={structuredData} /> : null}
        {renderDesignRoute(activeTemplate, {
          content,
          contentDebug,
          currentPath: `/projects/${project.id}`,
          project,
          route: "project-detail",
        })}
      </>
    );
  }

  return (
    <>
      {structuredData ? <StructuredData data={structuredData} /> : null}
      <PageShell {...shellProps}>
        <ProjectDetailView
          contentDebug={contentDebug}
          homeTemplate={activeTemplate}
          pageCopy={content.presentation.pages.projectDetail}
          project={project}
        />
      </PageShell>
    </>
  );
}
