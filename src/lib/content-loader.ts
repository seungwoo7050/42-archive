import contactJson from "@/content/contact.json";
import curationJson from "@/content/curation.json";
import experienceJson from "@/content/experience.json";
import interviewMapJson from "@/content/interview-map.json";
import journeyJson from "@/content/journey.json";
import journeyNarrativeJson from "@/content/journey-narrative.json";
import linksJson from "@/content/links.json";
import presentationJson from "@/content/presentation.json";
import profileJson from "@/content/profile.json";
import projectsJson from "@/content/projects.json";
import resumeJson from "@/content/resume.json";
import siteJson from "@/content/site.json";
import skillsJson from "@/content/skills.json";
import techStackJson from "@/content/tech-stack.json";
import { z } from "zod";

import {
  contactContentSchema,
  curationContentSchema,
  experienceContentSchema,
  interviewMapContentSchema,
  journeyContentSchema,
  journeyNarrativeContentSchema,
  linksContentSchema,
  presentationContentSchema,
  profileContentSchema,
  projectsContentSchema,
  resumeContentSchema,
  siteContentSchema,
  skillsContentSchema,
  techStackContentSchema,
} from "./content-schema";

export type ContentValidationIssue = {
  file: string;
  path: string;
  message: string;
};

const supportedDesignIdList = [
  "design",
  "classic",
] as const;
const supportedDesignIds = new Set<string>(supportedDesignIdList);

type NavigablePageId =
  | "projects"
  | "about"
  | "resume"
  | "contact"
  | "journey"
  | "interviewMap";

const internalNavigationPages = new Map<string, NavigablePageId>([
  ["/projects", "projects"],
  ["/about", "about"],
  ["/resume", "resume"],
  ["/contact", "contact"],
  ["/journey", "journey"],
  ["/interview-map", "interviewMap"],
] as const);

export type PortfolioSourceOverrides = Partial<
  Record<
    | "site"
    | "profile"
    | "projects"
    | "presentation"
    | "skills"
    | "techStack"
    | "experience"
    | "journey"
    | "links"
    | "contact"
    | "resume"
    | "journeyNarrative"
    | "interviewMap"
    | "curation",
    unknown
  >
>;

export class PortfolioContentError extends Error {
  readonly issues: ContentValidationIssue[];

  constructor(issues: ContentValidationIssue[]) {
    const details = issues
      .map(({ file, path, message }) => `- ${file}:${path} ${message}`)
      .join("\n");

    super(`Portfolio content validation failed:\n${details}`);
    this.name = "PortfolioContentError";
    this.issues = issues;
  }
}
