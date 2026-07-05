import contactJson from "@/content/contact.json";
import experienceJson from "@/content/experience.json";
import journeyJson from "@/content/journey.json";
import linksJson from "@/content/links.json";
import presentationJson from "@/content/presentation.json";
import profileJson from "@/content/profile.json";
import projectsJson from "@/content/projects.json";
import resumeJson from "@/content/resume.json";
import siteJson from "@/content/site.json";
import skillsJson from "@/content/skills.json";
import techStackJson from "@/content/tech-stack.json";
import type {
  ContactContent,
  ContentLink,
  ExperienceItem,
  JourneyItem,
  PortfolioContent,
  PortfolioEnv,
  PortfolioProject,
  PresentationContent,
  ProfileContent,
  ResumeContent,
  SiteContent,
  SkillsContent,
  TechStackItem,
} from "./types";

const site = siteJson as SiteContent;
const profile = profileJson as ProfileContent;
export const portfolioPresentation =
  presentationJson as PresentationContent;
type ProjectContentFile =
  | PortfolioProject[]
  | { items: PortfolioProject[] };

const projectContentFile = projectsJson as unknown as ProjectContentFile;
const projects = Array.isArray(projectContentFile)
  ? projectContentFile
  : projectContentFile.items;
const skills = skillsJson as SkillsContent;
const techStack = techStackJson as TechStackItem[];
const experience = experienceJson as ExperienceItem[];
const journey = (journeyJson as JourneyItem[]).slice().sort((left, right) => {
  const dateOrder = left.date.localeCompare(right.date);

  if (dateOrder !== 0) {
    return dateOrder;
  }

  return left.title.localeCompare(right.title);
});
const links = linksJson as ContentLink[];
const contact = contactJson as ContactContent;
const resume = resumeJson as ResumeContent;
export const portfolioTechStackById = new Map(
  techStack.map((item) => [item.id, item]),
);

export function getEnabledLinks(contentLinks: ContentLink[] = links) {
  return contentLinks.filter((link) => link.enabled !== false);
}

function withEnvHref(link: ContentLink, env: PortfolioEnv): ContentLink {
  const envValue = link.envKey ? env[link.envKey]?.trim() : undefined;

  return {
    ...link,
    href: envValue && envValue.length > 0 ? envValue : link.href,
  };
}

export function getPortfolioContent(
  env: PortfolioEnv = {
    NEXT_PUBLIC_DASHBOARD_URL: process.env.NEXT_PUBLIC_DASHBOARD_URL,
    NEXT_PUBLIC_SEOUL_APP_URL: process.env.NEXT_PUBLIC_SEOUL_APP_URL,
  },
): PortfolioContent {
  const resolvedProjects = projects
    .filter((project) => project.enabled !== false)
    .map((project) => ({
      ...project,
      links: project.links
        .filter((link) => link.enabled !== false)
        .map((link) => withEnvHref(link, env)),
    }));

  return {
    site,
    profile,
    projects: resolvedProjects,
    presentation: portfolioPresentation,
    skills,
    techStack,
    experience,
    journey,
    links: getEnabledLinks(),
    contact,
    resume,
  };
}
