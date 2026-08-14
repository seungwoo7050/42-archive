import type { PortfolioProject, SiteDesignId } from "@/lib/portfolio";
import type { PortfolioRouteId } from "@/designs/types";
import type { PortfolioRouteViewModel } from "@/lib/portfolio/view-models";

export type PreparedDesignRouteProps = {
  content: PortfolioRouteViewModel;
  contentDebug: boolean;
  currentPath: string;
  project?: PortfolioProject;
  route: PortfolioRouteId;
};

export function createDesignShellProps(
  content: PortfolioRouteViewModel,
  contentDebug: boolean,
  currentPath: string,
  designId: Extract<SiteDesignId, "classic" | "design">,
) {
  return {
    contentDebug,
    homeTemplate: designId,
    profile: content.profile,
    routeRenderer: designId,
    site: content.site,
    templateSwitcher: {
      activeId: designId,
      contentDebug,
      currentPath,
      templates: content.presentation.templates,
    },
    ui: content.presentation.ui,
  } as const;
}
