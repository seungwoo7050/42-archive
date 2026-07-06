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

function jsonPath(path: PropertyKey[]) {
  if (path.length === 0) {
    return "$";
  }

  return path.reduce<string>((result, segment) => {
    if (typeof segment === "number") {
      return `${result}[${segment}]`;
    }

    const key = String(segment);
    return /^[a-zA-Z_$][\w$]*$/.test(key)
      ? `${result}.${key}`
      : `${result}[${JSON.stringify(key)}]`;
  }, "$" );
}

function parseContentFile<Schema extends z.ZodType>(
  file: string,
  schema: Schema,
  input: unknown,
): z.output<Schema> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new PortfolioContentError(
      parsed.error.issues.map((issue) => ({
        file,
        path: jsonPath(issue.path),
        message: issue.message,
      })),
    );
  }

  return parsed.data;
}

function findDuplicates(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }

    seen.add(value);
  }

  return duplicates;
}

function addDuplicateIssues(
  issues: ContentValidationIssue[],
  file: string,
  path: string,
  label: string,
  values: string[],
) {
  for (const duplicate of findDuplicates(values)) {
    issues.push({
      file,
      path,
      message: `Duplicate ${label} "${duplicate}".`,
    });
  }
}

function addMissingReferenceIssue(
  issues: ContentValidationIssue[],
  file: string,
  path: string,
  referenceType: string,
  reference: string,
  knownReferences: Set<string>,
) {
  if (!knownReferences.has(reference)) {
    issues.push({
      file,
      path,
      message: `Unknown ${referenceType} "${reference}".`,
    });
  }
}

function addInternalRouteIssue({
  enabledProjectIds,
  file,
  href,
  issues,
  path,
  routeKind,
  site,
}: {
  enabledProjectIds: Set<string>;
  file: string;
  href: string;
  issues: ContentValidationIssue[];
  path: string;
  routeKind: "link" | "navigation";
  site: z.output<typeof siteContentSchema>;
}) {
  if (!href.startsWith("/") || href.startsWith("//")) {
    return;
  }

  const pathname = new URL(href, "https://portfolio.invalid").pathname;
  if (pathname === "/") {
    return;
  }

  const projectMatch = pathname.match(/^\/projects\/([^/]+)\/?$/);
  const pageId = projectMatch
    ? "projects"
    : internalNavigationPages.get(pathname);

  if (!pageId) {
    issues.push({
      file,
      path,
      message: `Unsupported internal ${routeKind} route "${pathname}".`,
    });
    return;
  }

  if (site.pages?.[pageId] === false) {
    issues.push({
      file,
      path,
      message: `Internal ${routeKind} route "${pathname}" points to disabled page "${pageId}".`,
    });
  }

  if (projectMatch) {
    const projectId = decodeURIComponent(projectMatch[1]);
    if (!enabledProjectIds.has(projectId)) {
      issues.push({
        file,
        path,
        message: `Internal ${routeKind} route "${pathname}" points to unknown or disabled project "${projectId}".`,
      });
    }
  }
}

export function loadPortfolioSource(overrides: PortfolioSourceOverrides = {}) {
  const input = {
    site: siteJson,
    profile: profileJson,
    projects: projectsJson,
    presentation: presentationJson,
    skills: skillsJson,
    techStack: techStackJson,
    experience: experienceJson,
    journey: journeyJson,
    links: linksJson,
    contact: contactJson,
    resume: resumeJson,
    journeyNarrative: journeyNarrativeJson,
    interviewMap: interviewMapJson,
    curation: curationJson,
    ...overrides,
  };

  const site = parseContentFile("src/content/site.json", siteContentSchema, input.site);
  const profile = parseContentFile(
    "src/content/profile.json",
    profileContentSchema,
    input.profile,
  );
  const projects = parseContentFile(
    "src/content/projects.json",
    projectsContentSchema,
    input.projects,
  );
  const presentation = parseContentFile(
    "src/content/presentation.json",
    presentationContentSchema,
    input.presentation,
  );
  const skills = parseContentFile(
    "src/content/skills.json",
    skillsContentSchema,
    input.skills,
  );
  const techStack = parseContentFile(
    "src/content/tech-stack.json",
    techStackContentSchema,
    input.techStack,
  );
  const experience = parseContentFile(
    "src/content/experience.json",
    experienceContentSchema,
    input.experience,
  );
  const journey = parseContentFile(
    "src/content/journey.json",
    journeyContentSchema,
    input.journey,
  );
  const links = parseContentFile(
    "src/content/links.json",
    linksContentSchema,
    input.links,
  );
  const contact = parseContentFile(
    "src/content/contact.json",
    contactContentSchema,
    input.contact,
  );
  const resume = parseContentFile(
    "src/content/resume.json",
    resumeContentSchema,
    input.resume,
  );
  const journeyNarrative = parseContentFile(
    "src/content/journey-narrative.json",
    journeyNarrativeContentSchema,
    input.journeyNarrative,
  );
  const interviewMap = parseContentFile(
    "src/content/interview-map.json",
    interviewMapContentSchema,
    input.interviewMap,
  );
  const curation = parseContentFile(
    "src/content/curation.json",
    curationContentSchema,
    input.curation,
  );

  const issues: ContentValidationIssue[] = [];
  const groupIds = new Set(projects.groups.map((group) => group.id));
  const enabledProjectIds = new Set(
    projects.items
      .filter((project) => project.enabled !== false)
      .map((project) => project.id),
  );
  const stackIds = new Set(techStack.map((item) => item.id));
  const tagIds = new Set(
    projects.items
      .filter((project) => project.enabled !== false)
      .flatMap((project) => project.tags),
  );
  const enabledLinkIds = new Set(
    links.flatMap((link) =>
      link.id !== undefined && link.enabled !== false ? [link.id] : [],
    ),
  );

  addDuplicateIssues(
    issues,
    "src/content/projects.json",
    "$.groups",
    "project group id",
    projects.groups.map((group) => group.id),
  );
  addDuplicateIssues(
    issues,
    "src/content/projects.json",
    "$.groups",
    "project group order",
    projects.groups.map((group) => String(group.order)),
  );
  addDuplicateIssues(
    issues,
    "src/content/projects.json",
    "$.metrics",
    "project metric id",
    projects.metrics.map((metric) => metric.id),
  );
  addDuplicateIssues(
    issues,
    "src/content/projects.json",
    "$.items",
    "project id",
    projects.items.map((project) => project.id),
  );
  addDuplicateIssues(
    issues,
    "src/content/projects.json",
    "$.items",
    "project order",
    projects.items.map((project) => project.order),
  );
  addDuplicateIssues(
    issues,
    "src/content/tech-stack.json",
    "$",
    "technology id",
    techStack.map((item) => item.id),
  );
  addDuplicateIssues(
    issues,
    "src/content/links.json",
    "$",
    "link id",
    links.flatMap((link) => (link.id === undefined ? [] : [link.id])),
  );
  addDuplicateIssues(
    issues,
    "src/content/journey-narrative.json",
    "$.milestones",
    "milestone id",
    journeyNarrative.milestones.map((milestone) => milestone.id),
  );
  addDuplicateIssues(
    issues,
    "src/content/interview-map.json",
    "$.tracks",
    "interview track id",
    interviewMap.tracks.map((track) => track.id),
  );
  addDuplicateIssues(
    issues,
    "src/content/curation.json",
    "$.categories",
    "curation category id",
    curation.categories.map((category) => category.id),
  );
  addDuplicateIssues(
    issues,
    "src/content/presentation.json",
    "$.templates",
    "site design id",
    presentation.templates.map((template) => template.id),
  );
  addDuplicateIssues(
    issues,
    "src/content/site.json",
    "$.navigation",
    "navigation href",
    site.navigation.map((item) => item.href),
  );

  if (
    !presentation.templates.some(
      (template) => template.id === presentation.defaultHomeTemplate,
    )
  ) {
    issues.push({
      file: "src/content/presentation.json",
      path: "$.defaultHomeTemplate",
      message: `Default site design "${presentation.defaultHomeTemplate}" is not listed in templates.`,
    });
  }

  presentation.templates.forEach((template, templateIndex) => {
    if (!supportedDesignIds.has(template.id)) {
      issues.push({
        file: "src/content/presentation.json",
        path: `$.templates[${templateIndex}].id`,
        message: `Unsupported site design "${template.id}".`,
      });
    }
  });

  const configuredDesignIds = new Set(
    presentation.templates.map((template) => template.id),
  );
  supportedDesignIdList.forEach((designId) => {
    if (!configuredDesignIds.has(designId)) {
      issues.push({
        file: "src/content/presentation.json",
        path: "$.templates",
        message: `Missing supported site design "${designId}".`,
      });
    }
  });
  if (issues.length > 0) {
    throw new PortfolioContentError(issues);
  }

  return {
    site,
    profile,
    projects,
    presentation,
    skills,
    techStack,
    experience,
    journey,
    journeyNarrative,
    interviewMap,
    curation,
    links,
    contact,
    resume,
  };
}

export const portfolioSource = loadPortfolioSource();

export type PortfolioSource = ReturnType<typeof loadPortfolioSource>;
