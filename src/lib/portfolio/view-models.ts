import {
  getContentLinksByPlacement,
  getPreferredContactLinks,
  getProjectDetailLinks,
  getProjectMetricValue,
} from "./selectors";
import type {
  ContentLink,
  CurationCategory,
  JourneyItem,
  JourneyMilestone,
  PortfolioContent,
  PortfolioProject,
  ProjectGroup,
  ProjectImage,
  ProjectMetric,
  TechStackItem,
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

export type ProjectDetailViewModel = RouteViewModelBase & {
  route: "project-detail";
  detailLinks: ContentLink[];
  project: PortfolioProject;
  stackItems: TechStackItem[];
  supportingImages: ProjectImage[];
};

export type AboutViewModel = RouteViewModelBase & {
  route: "about";
  curationCategories: CurationCategoryViewModel[];
};

export type ResumeViewModel = RouteViewModelBase & {
  route: "resume";
  resumeProjects: PortfolioProject[];
};

export type ContactViewModel = RouteViewModelBase & {
  route: "contact";
  cinematicLinks: ContentLink[];
  contactPlacementLinks: ContentLink[];
  preferredLinks: ContentLink[];
  preferredOrContactLinks: ContentLink[];
};

export type JourneyMilestoneViewModel = JourneyMilestone & {
  anchorProjects: PortfolioProject[];
};

export type JourneyItemViewModel = JourneyItem & {
  project: PortfolioProject | null;
};

export type JourneyViewModel = RouteViewModelBase & {
  route: "journey";
  milestones: JourneyMilestoneViewModel[];
  timelineItems: JourneyItemViewModel[];
};

export type PortfolioRouteViewModel =
  | HomeViewModel
  | ProjectIndexViewModel
  | ProjectDetailViewModel
  | AboutViewModel
  | ResumeViewModel
  | ContactViewModel
  | JourneyViewModel;

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

export function createProjectDetailViewModel(
  content: PortfolioContent,
  projectId: string,
): ProjectDetailViewModel | null {
  const project = content.projects.find((item) => item.id === projectId);

  if (!project) {
    return null;
  }

  const stackById = new Map(
    content.techStack.map((item) => [item.id, item]),
  );

  return {
    ...createRouteViewModelBase(content),
    detailLinks: getProjectDetailLinks(project),
    project,
    projects: [],
    route: "project-detail",
    stackItems: project.stack.map(
      (id) =>
        stackById.get(id) ?? {
          color: "#9cc8b1",
          icon: "tool",
          id,
          label: id,
        },
    ),
    supportingImages: project.screenshots.filter(
      (image) => image.src !== project.screenshot.src,
    ),
  };
}

export function createAboutViewModel(
  content: PortfolioContent,
): AboutViewModel {
  const projectById = new Map(
    content.projects.map((project) => [project.id, project]),
  );

  return {
    ...createRouteViewModelBase(content),
    curationCategories: content.curation.categories.map((category) => ({
      ...category,
      projects: category.projectIds
        .map((projectId) => projectById.get(projectId))
        .filter((project): project is PortfolioProject => Boolean(project)),
    })),
    projects: [],
    route: "about",
  };
}

export function createResumeViewModel(
  content: PortfolioContent,
): ResumeViewModel {
  const projectById = new Map(
    content.projects.map((project) => [project.id, project]),
  );

  return {
    ...createRouteViewModelBase(content),
    resumeProjects: content.resume.projectIds
      .map((projectId) => projectById.get(projectId))
      .filter((project): project is PortfolioProject => Boolean(project)),
    projects: [],
    route: "resume",
  };
}

export function createContactViewModel(
  content: PortfolioContent,
): ContactViewModel {
  const contactPlacementLinks = getContentLinksByPlacement("contact", content);
  const preferredLinks = getPreferredContactLinks(content);
  const preferredOrContactLinks =
    preferredLinks.length > 0 ? preferredLinks : contactPlacementLinks;

  return {
    ...createRouteViewModelBase(content),
    cinematicLinks: preferredOrContactLinks,
    contactPlacementLinks,
    preferredLinks,
    preferredOrContactLinks,
    projects: [],
    route: "contact",
  };
}

export function createJourneyViewModel(
  content: PortfolioContent,
): JourneyViewModel {
  const projectById = new Map(
    content.projects.map((project) => [project.id, project]),
  );

  return {
    ...createRouteViewModelBase(content),
    milestones: content.journeyNarrative.milestones.map((milestone) => ({
      ...milestone,
      anchorProjects: milestone.anchorProjectIds
        .map((projectId) => projectById.get(projectId))
        .filter((project): project is PortfolioProject => Boolean(project)),
    })),
    projects: [],
    route: "journey",
    timelineItems: content.journey.map((item) => ({
      ...item,
      project: item.projectId ? (projectById.get(item.projectId) ?? null) : null,
    })),
  };
}
