import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StructuredData } from "@/components/portfolio/structured-data";
import { renderDesignRoute } from "@/designs/registry";
import {
  resolvePortfolioContentMode,
  resolveProductionSiteUrl,
} from "@/lib/content-readiness";
import { resolvePortfolioPageContext } from "@/lib/portfolio/page-context";
import { createProjectDetailViewModel } from "@/lib/portfolio/view-models";
import {
  getPortfolioContent,
  getProjectById,
  isSitePageEnabled,
  type RouteSearchParams,
} from "@/lib/portfolio";
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
  const viewModel = createProjectDetailViewModel(content, projectId);
  if (!viewModel) notFound();

  const { activeTemplate, contentDebug } =
    await resolvePortfolioPageContext({
      content,
      currentPath: `/projects/${projectId}`,
      searchParams,
    });

  const mode = resolvePortfolioContentMode(
    process.env.PORTFOLIO_CONTENT_MODE,
  );
  const structuredData =
    mode === "production"
      ? createProjectStructuredData({
          content,
          project: viewModel.project,
          siteUrl: resolveProductionSiteUrl(process.env.SITE_URL),
        })
      : undefined;

  const designRoute = await renderDesignRoute(activeTemplate, {
    contentDebug,
    currentPath: `/projects/${viewModel.project.id}`,
    route: "project-detail",
    viewModel,
  });

  return (
    <>
      {structuredData ? <StructuredData data={structuredData} /> : null}
      {designRoute}
    </>
  );
}
