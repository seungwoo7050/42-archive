import type { PortfolioProject } from "@/lib/portfolio";
import type { PortfolioRouteViewModel } from "@/lib/portfolio/view-models";

export type PortfolioRouteId =
  | "home"
  | "projects"
  | "project-detail"
  | "about"
  | "resume"
  | "contact"
  | "journey"
  | "interview-map";

export type DesignRouteProps = {
  content: PortfolioRouteViewModel;
  contentDebug: boolean;
  currentPath: string;
  project?: PortfolioProject;
  route: PortfolioRouteId;
};

type ViewModelDesignRouteRequest = {
  [Route in PortfolioRouteViewModel["route"]]: {
    contentDebug: boolean;
    currentPath: string;
    route: Route;
    viewModel: Extract<PortfolioRouteViewModel, { route: Route }>;
  };
}[PortfolioRouteViewModel["route"]];

export type DesignRouteRequestProps = ViewModelDesignRouteRequest;
