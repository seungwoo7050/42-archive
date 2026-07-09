import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { DesignSwitcher } from "@/components/portfolio/design-switcher";
import {
  getPreferredContactLinks,
  getProjectDetailLinks,
  getProjectMetricValue,
  getResumeProjects,
  getTemplateHref,
  isSitePageEnabled,
  type ContentLink,
  type PortfolioContent,
  type PortfolioProject,
  type ProjectImage,
} from "@/lib/portfolio";

import styles from "./editorial-route.module.css";

export type EditorialRouteName =
  | "home"
  | "projects"
  | "project-detail"
  | "about"
  | "resume"
  | "contact"
  | "journey"
  | "interview-map";

export type EditorialRouteProps = {
  route: EditorialRouteName;
  content: PortfolioContent;
  project?: PortfolioProject;
  currentPath: string;
  contentDebug: boolean;
};

const DESIGN_ID = "editorial" as const;

const routeNumbers: Record<EditorialRouteName, string> = {
  home: "00",
  projects: "01",
  "project-detail": "01",
  about: "02",
  resume: "03",
  contact: "04",
  journey: "05",
  "interview-map": "06",
};

function editorialHref(path: string, contentDebug: boolean) {
  return getTemplateHref(path, DESIGN_ID, {
    contentDebug,
  });
}

function isCurrentNavigation(href: string, currentPath: string) {
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function twoDigits(index: number) {
  return String(index + 1).padStart(2, "0");
}

function getProjectTags(project: PortfolioProject) {
  return project.tags.slice(0, 4);
}
