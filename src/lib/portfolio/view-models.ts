import {
  getContentLinksByPlacement,
  getPreferredContactLinks,
  getProjectMetricValue,
} from "./selectors";
import type {
  ContentLink,
  CurationCategory,
  PortfolioContent,
  PortfolioProject,
  ProjectGroup,
  ProjectMetric,
} from "./types";

type RouteViewModelBase = PortfolioContent & {
  footerLinks: ContentLink[];
};

export type ProjectGroupViewModel = ProjectGroup & {
  projects: PortfolioProject[];
};

export type ProjectMetricViewModel = ProjectMetric & {
  value: number;
};

export type CurationCategoryViewModel = CurationCategory & {
  projects: PortfolioProject[];
};

export type HomeViewModel = RouteViewModelBase & {
  route: "home";
  currentYear: number;
  featuredProjects: PortfolioProject[];
  featuredOrAllProjects: PortfolioProject[];
  heroLinks: ContentLink[];
  leadProject: PortfolioProject | null;
  metricValues: Record<string, number>;
  metrics: ProjectMetricViewModel[];
  preferredContactLinks: ContentLink[];
  projectCount: number;
  recentJourney: PortfolioContent["journey"];
};

export type ProjectIndexViewModel = RouteViewModelBase & {
  route: "projects";
  archiveGroupEntries: [string, PortfolioProject[]][];
  archiveGroups: ProjectGroupViewModel[];
  archiveProjects: PortfolioProject[];
  featuredProjects: PortfolioProject[];
  groupEntries: [string, PortfolioProject[]][];
  groups: ProjectGroupViewModel[];
  metricValues: Record<string, number>;
  metrics: ProjectMetricViewModel[];
};

function createRouteViewModelBase(
  content: PortfolioContent,
): RouteViewModelBase {
  return {
    ...content,
    footerLinks: getContentLinksByPlacement("footer", content),
    links: [],
    projectGroups: [],
    projectMetrics: [],
  };
}

function resolveProjectGroups(
  content: PortfolioContent,
  projects: PortfolioProject[],
) {
  const projectsByGroup = new Map<string, PortfolioProject[]>();

  for (const project of projects) {
    projectsByGroup.set(project.groupId, [
      ...(projectsByGroup.get(project.groupId) ?? []),
      project,
    ]);
  }

  const configuredGroups = content.projectGroups
    .map((group) => ({
      ...group,
      projects: projectsByGroup.get(group.id) ?? [],
    }))
    .filter((group) => group.projects.length > 0);
  const configuredGroupIds = new Set(
    configuredGroups.map((group) => group.id),
  );
  const unconfiguredGroups = [...projectsByGroup.entries()]
    .filter(([groupId]) => !configuredGroupIds.has(groupId))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([groupId, groupedProjects], index) => ({
      description: "",
      id: groupId,
      label: groupedProjects[0]?.category ?? groupId,
      order: content.projectGroups.length + index,
      projects: groupedProjects,
    }));

  return [...configuredGroups, ...unconfiguredGroups];
}

export function createHomeViewModel(
  content: PortfolioContent,
  now: Date = new Date(),
): HomeViewModel {
  const featuredProjects = content.projects.filter(
    (project) => project.featured,
  );
  const featuredOrAllProjects =
    featuredProjects.length > 0 ? featuredProjects : content.projects;
  const metricValues = Object.fromEntries(
    content.projectMetrics.map((metric) => [
      metric.id,
      getProjectMetricValue(metric.id, content),
    ]),
  );
  const metrics = content.projectMetrics.map((metric) => ({
    ...metric,
    value: metricValues[metric.id] ?? 0,
  }));

  return {
    ...createRouteViewModelBase(content),
    currentYear: now.getFullYear(),
    featuredOrAllProjects,
    featuredProjects,
    heroLinks: getContentLinksByPlacement("hero", content),
    leadProject: featuredOrAllProjects[0] ?? null,
    metricValues,
    metrics,
    preferredContactLinks: getPreferredContactLinks(content),
    projectCount: content.projects.length,
    projects: [],
    recentJourney: content.journey.slice(-4).reverse(),
    route: "home",
  };
}

export function createProjectIndexViewModel(
  content: PortfolioContent,
): ProjectIndexViewModel {
  const featuredProjects = content.projects.filter(
    (project) => project.featured,
  );
  const archiveProjects = content.projects.filter(
    (project) => !project.featured,
  );

  const archiveGroups = resolveProjectGroups(content, archiveProjects);
  const groups = resolveProjectGroups(content, content.projects);
  const metrics = content.projectMetrics.map((metric) => ({
    ...metric,
    value: getProjectMetricValue(metric.id, content),
  }));

  return {
    ...createRouteViewModelBase(content),
    archiveGroupEntries: archiveGroups.map((group) => [
      group.label,
      group.projects,
    ]),
    archiveGroups,
    archiveProjects,
    featuredProjects,
    groupEntries: groups.map((group) => [group.label, group.projects]),
    groups,
    metricValues: Object.fromEntries(
      metrics.map((metric) => [metric.id, metric.value]),
    ),
    metrics,
    route: "projects",
  };
}
