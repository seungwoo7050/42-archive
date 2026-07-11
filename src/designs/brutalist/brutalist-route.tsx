import Link from "next/link";
import { DesignSwitcher } from "@/components/portfolio/design-switcher";
import {
  getProjectMetricValue,
  getTemplateHref,
  type PortfolioContent,
  type PortfolioProject,
} from "@/lib/portfolio";
import type { DesignRouteProps } from "@/designs/types";
import styles from "./brutalist.module.css";

const DESIGN_ID = "brutalist" as const;

type GroupedProjects = {
  description: string;
  id: string;
  label: string;
  projects: PortfolioProject[];
};

type CopyTemplateToken =
  | "count"
  | "handle"
  | "name"
  | "number"
  | "title"
  | "year";

export function brutalistHref(path: string, contentDebug: boolean) {
  return getTemplateHref(path, DESIGN_ID, {
    contentDebug,
  });
}

export function renderCopyTemplate(
  template: string,
  values: Partial<Record<CopyTemplateToken, string>>,
) {
  return Object.entries(values).reduce(
    (copy, [token, value]) => copy.replaceAll(`{${token}}`, value),
    template,
  );
}

export function getProjectTags(project: PortfolioProject, limit = 4) {
  const tags = project.tags;
  const source = tags && tags.length > 0 ? tags : project.stack;

  return source.filter(Boolean).slice(0, limit);
}

export function groupProjects(content: PortfolioContent): GroupedProjects[] {
  return content.projectGroups
    .map((group) => {
      const projects = content.projects.filter((project) => {
        return project.groupId === group.id;
      });

      return { ...group, projects };
    })
    .filter((group) => group.projects.length > 0);
}

export function getHomeMetrics(content: PortfolioContent) {
  return content.projectMetrics.slice(0, 4).map((metric) => ({
    description: metric.description,
    id: metric.id,
    label: metric.label,
    value: getProjectMetricValue(metric.id, content),
  }));
}

export function isCurrentNavigation(href: string, currentPath: string) {
  if (href === "/") {
    return currentPath === "/";
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function getNavigationLabel(
  content: PortfolioContent,
  href: string,
  fallback: string,
) {
  return (
    content.site.navigation.find((item) => item.href === href)?.label ?? fallback
  );
}

export function getRouteLabel(
  content: PortfolioContent,
  route: DesignRouteProps["route"],
) {
  const pages = content.presentation.pages;

  switch (route) {
    case "home":
      return getNavigationLabel(
        content,
        "/",
        content.presentation.home.brutalist.stampLabel,
      );
    case "projects":
      return getNavigationLabel(
        content,
        "/projects",
        pages.projects.brutalist.hero.title,
      );
    case "project-detail":
      return pages.projectDetail.caseLabel;
    case "about":
      return getNavigationLabel(content, "/about", pages.about.hero.title);
    case "resume":
      return getNavigationLabel(content, "/resume", pages.resume.hero.title);
    case "contact":
      return getNavigationLabel(content, "/contact", content.contact.title);
    case "journey":
      return getNavigationLabel(content, "/journey", pages.journey.hero.title);
    case "interview-map":
      return getNavigationLabel(
        content,
        "/interview-map",
        pages.interviewMap.hero.title,
      );
  }
}


export function BrutalistShell({
  children,
  content,
  contentDebug,
  currentPath,
  route,
}: {
  children: React.ReactNode;
  content: PortfolioContent;
  contentDebug: boolean;
  currentPath: string;
  route: DesignRouteProps["route"];
}) {
  const ui = content.presentation.ui;
  return (
    <div
      className={styles.root}
      data-content-debug={contentDebug ? "true" : "false"}
      data-site-design={DESIGN_ID}
    >
      <a className={styles.skipLink} href="#brutalist-main">
        {ui.skipLinkLabel}
      </a>
      <header className={styles.header}>
        <div className={styles.headerBar}>
          <Link
            className={styles.brand}
            href={brutalistHref("/", contentDebug)}
          >
            <span className={styles.brandMark} aria-hidden="true">
              ■
            </span>
            <span>{content.site.brand}</span>
          </Link>
          <div className={styles.headerStatus}>
            <span>{getRouteLabel(content, route)}</span>
            <span aria-hidden="true">/</span>
            <span>{content.profile.location}</span>
          </div>
          <div className={styles.switcher}>
            <DesignSwitcher
              activeId={DESIGN_ID}
              contentDebug={contentDebug}
              currentPath={currentPath}
              templates={content.presentation.templates}
              ui={content.presentation.ui}
            />
          </div>
        </div>
      </header>
      <main className={styles.main} id="brutalist-main">
        {children}
      </main>
    </div>
  );
}
