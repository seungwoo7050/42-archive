import experienceJson from "@/content/experience.json";
import presentationJson from "@/content/presentation.json";
import profileJson from "@/content/profile.json";
import projectsJson from "@/content/projects.json";
import siteJson from "@/content/site.json";
import skillsJson from "@/content/skills.json";
import techStackJson from "@/content/tech-stack.json";
import type {
  ExperienceItem,
  PortfolioProject,
  PresentationContent,
  ProfileContent,
  SiteContent,
  SkillsContent,
  TechStackItem,
} from "./types";

const site = siteJson as SiteContent;
const profile = profileJson as ProfileContent;
export const portfolioPresentation =
  presentationJson as PresentationContent;
const projects = projectsJson as PortfolioProject[];
const skills = skillsJson as SkillsContent;
const techStack = techStackJson as TechStackItem[];
const experience = experienceJson as ExperienceItem[];
