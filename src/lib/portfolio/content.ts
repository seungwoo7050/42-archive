import { portfolioSource } from "../content-loader";
import type {
  ContactContent,
  ContentLink,
  CurationContent,
  ExperienceItem,
  InterviewMapContent,
  JourneyItem,
  JourneyNarrativeContent,
  PortfolioContent,
  PortfolioProject,
  PresentationContent,
  ProfileContent,
  ProjectGroup,
  ProjectMetric,
  ResumeContent,
  SiteContent,
  SkillsContent,
  TechStackItem,
} from "./types";

const site = portfolioSource.site as SiteContent;
const profile = portfolioSource.profile as ProfileContent;
const projectGroups = portfolioSource.projects.groups
  .slice()
  .sort((left, right) => left.order - right.order) as ProjectGroup[];
const projectMetrics = portfolioSource.projects.metrics as ProjectMetric[];
const projectGroupById = new Map(
  projectGroups.map((group) => [group.id, group]),
);
const projects = portfolioSource.projects.items.map((project) => ({
  ...project,
  category: projectGroupById.get(project.groupId)?.label ?? project.groupId,
})) as PortfolioProject[];
const presentationSource = portfolioSource.presentation as unknown as PresentationContent;
export const portfolioPresentation = {
  ...presentationSource,
  pages: {
    ...presentationSource.pages,
    projects: {
      ...presentationSource.pages.projects,
      groups: projectGroups.map((group) => ({
        category: group.label,
        body: group.description,
      })),
    },
  },
} satisfies PresentationContent;
const skills = portfolioSource.skills as SkillsContent;
const techStack = portfolioSource.techStack as TechStackItem[];
const experience = portfolioSource.experience as ExperienceItem[];
const journey = (portfolioSource.journey as JourneyItem[]).slice().sort((left, right) => {
  const dateOrder = left.date.localeCompare(right.date);

  if (dateOrder !== 0) {
    return dateOrder;
  }

  return left.title.localeCompare(right.title);
});
const links = portfolioSource.links as ContentLink[];
const contact = portfolioSource.contact as ContactContent;
const resume = portfolioSource.resume as ResumeContent;
const journeyNarrative = portfolioSource.journeyNarrative as JourneyNarrativeContent;
const interviewMap = portfolioSource.interviewMap as InterviewMapContent;
const curation = portfolioSource.curation as CurationContent;
export const portfolioTechStackById = new Map(
  techStack.map((item) => [item.id, item]),
);

export function getEnabledLinks(contentLinks: ContentLink[] = links) {
  return contentLinks.filter((link) => link.enabled !== false);
}

export function getPortfolioContent(
  _legacyEnvironment?: Readonly<Record<string, string | undefined>>,
): PortfolioContent {
  void _legacyEnvironment;

  const resolvedProjects = projects
    .filter((project) => project.enabled !== false)
    .map((project) => ({
      ...project,
      links: project.links.filter((link) => link.enabled !== false),
    }));

  return {
    site,
    profile,
    projects: resolvedProjects,
    projectGroups,
    projectMetrics,
    presentation: portfolioPresentation,
    skills,
    techStack,
    experience,
    journey,
    journeyNarrative,
    interviewMap,
    curation,
    links: getEnabledLinks(),
    contact,
    resume,
  };
}
