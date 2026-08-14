import { getPortfolioContent } from "./content";
import { resolveContentDebug, resolveHomeTemplateId } from "./selectors";
import type {
  PortfolioContent,
  RouteSearchParams,
} from "./types";

export type PortfolioPagePath =
  | "/"
  | "/about"
  | "/contact"
  | "/interview-map"
  | "/journey"
  | "/projects"
  | "/resume"
  | `/projects/${string}`;

export async function resolvePortfolioPageContext({
  content = getPortfolioContent(),
  currentPath,
  searchParams,
}: {
  content?: PortfolioContent;
  currentPath: PortfolioPagePath;
  searchParams?: RouteSearchParams;
}) {
  const query = searchParams ? await searchParams : {};
  const activeTemplate = resolveHomeTemplateId(
    query.view,
    content.presentation,
  );
  const contentDebug = resolveContentDebug(query.debug);

  return {
    activeTemplate,
    content,
    contentDebug,
    shellProps: {
      contentDebug,
      homeTemplate: activeTemplate,
      profile: content.profile,
      site: content.site,
      ui: content.presentation.ui,
      templateSwitcher: {
        activeId: activeTemplate,
        contentDebug,
        currentPath,
        defaultId: content.presentation.defaultHomeTemplate,
        templates: content.presentation.templates,
      },
    },
  };
}
