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
