import {
  getProjectMetricValue,
  getTemplateHref,
  type PortfolioContent,
  type PortfolioProject,
} from "@/lib/portfolio";

const DESIGN_ID = "brutalist" as const;

type GroupedProjects = {
  description: string;
  id: string;
  label: string;
  projects: PortfolioProject[];
};

type CopyTemplateToken =
  | "count"
  | "handle"
  | "name"
  | "number"
  | "title"
  | "year";

export function brutalistHref(path: string, contentDebug: boolean) {
  return getTemplateHref(path, DESIGN_ID, {
    contentDebug,
  });
}

export function renderCopyTemplate(
  template: string,
  values: Partial<Record<CopyTemplateToken, string>>,
) {
  return Object.entries(values).reduce(
    (copy, [token, value]) => copy.replaceAll(`{${token}}`, value),
    template,
  );
}

export function getProjectTags(project: PortfolioProject, limit = 4) {
  const tags = project.tags;
  const source = tags && tags.length > 0 ? tags : project.stack;

  return source.filter(Boolean).slice(0, limit);
}

export function groupProjects(content: PortfolioContent): GroupedProjects[] {
  return content.projectGroups
    .map((group) => {
      const projects = content.projects.filter((project) => {
        return project.groupId === group.id;
      });

      return { ...group, projects };
    })
    .filter((group) => group.projects.length > 0);
}

export function getHomeMetrics(content: PortfolioContent) {
  return content.projectMetrics.slice(0, 4).map((metric) => ({
    description: metric.description,
    id: metric.id,
    label: metric.label,
    value: getProjectMetricValue(metric.id, content),
  }));
}

export function isCurrentNavigation(href: string, currentPath: string) {
  if (href === "/") {
    return currentPath === "/";
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function getNavigationLabel(
  content: PortfolioContent,
  href: string,
  fallback: string,
) {
  return (
    content.site.navigation.find((item) => item.href === href)?.label ?? fallback
  );
}
