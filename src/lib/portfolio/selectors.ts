import { portfolioPresentation } from "./content";
import type {
  HomeTemplateId,
  PresentationContent,
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
