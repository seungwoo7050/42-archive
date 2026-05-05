import {
  getPortfolioContent,
  portfolioPresentation,
  portfolioTechStackById,
} from "./content";
import type {
  HomeTemplateId,
  PortfolioContent,
  PortfolioProject,
  PresentationContent,
  TechStackItem,
} from "./types";
import { createTemplateHref } from "./template-href";

export function resolveHomeTemplateId(
  value: string | string[] | undefined,
  content: PresentationContent = portfolioPresentation,
): HomeTemplateId {
  const templateId = Array.isArray(value) ? value[0] : value;

  if (
    templateId &&
    content.templates.some((template) => template.id === templateId)
  ) {
    return templateId as HomeTemplateId;
  }

  return content.defaultHomeTemplate;
}

export function resolveContentDebug(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) === "content";
}

export function getTemplateHref(
  href: string,
  templateId?: HomeTemplateId,
  options: { alwaysInclude?: boolean; contentDebug?: boolean } = {},
) {
  return createTemplateHref(
    href,
    templateId,
    portfolioPresentation.defaultHomeTemplate,
    options,
  );
}

export function resolveTechStackItem(id: string): TechStackItem {
  return (
    portfolioTechStackById.get(id) ?? {
      id,
      label: id,
      icon: "tool",
      color: "#9cc8b1",
    }
  );
}

export function getFeaturedProjects(
  content: PortfolioContent = getPortfolioContent(),
) {
  return content.projects.filter((project) => project.featured);
}

export function getProjectById(
  projectId: string,
  content: PortfolioContent = getPortfolioContent(),
) {
  return content.projects.find((project) => project.id === projectId) ?? null;
}

export function getResumeProjects(
  content: PortfolioContent = getPortfolioContent(),
) {
  const byId = new Map(content.projects.map((project) => [project.id, project]));

  return content.resume.projectIds
    .map((projectId) => byId.get(projectId))
    .filter((project): project is PortfolioProject => Boolean(project));
}
