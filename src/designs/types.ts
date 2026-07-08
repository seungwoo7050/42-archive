import type { PortfolioContent, PortfolioProject } from "@/lib/portfolio";

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
  content: PortfolioContent;
  contentDebug: boolean;
  currentPath: string;
  project?: PortfolioProject;
  route: PortfolioRouteId;
};
