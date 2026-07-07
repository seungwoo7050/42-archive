import { PageShell } from "@/components/portfolio/site-shell";
import { notFound } from "next/navigation";
import { ClassicProjectsView } from "@/designs/classic/projects/projects-route";
import { DesignProjectsView } from "@/designs/design/projects/projects-route";
import {
  getPortfolioContent,
  isSitePageEnabled,
  getProjectMetricValue,
  resolveContentDebug,
  resolveHomeTemplateId,
  type RouteSearchParams,
} from "@/lib/portfolio";
import { groupProjects } from "@/lib/portfolio/project-groups";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: RouteSearchParams;
}) {
  const content = getPortfolioContent();
  if (!isSitePageEnabled("projects", content)) notFound();
  const params = searchParams ? await searchParams : {};
  const activeTemplate = resolveHomeTemplateId(params.view, content.presentation);
  const contentDebug = resolveContentDebug(params.debug);
  const pageCopy = content.presentation.pages.projects;
  const featuredProjects = content.projects.filter((project) => project.featured);
  const trackProjects = content.projects.filter((project) => !project.featured);
  const groupedProjects = groupProjects(trackProjects, pageCopy.groups);
  const sourceOnlyCount = getProjectMetricValue("sourceOnlyCount", content);
  const curriculumCount = getProjectMetricValue("curriculumCount", content);
  const shellProps = {
    contentDebug,
    homeTemplate: activeTemplate,
    profile: content.profile,
    site: content.site,
    templateSwitcher: {
      activeId: activeTemplate,
      contentDebug,
      currentPath: "/projects",
      templates: content.presentation.templates,
    },
  };

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
