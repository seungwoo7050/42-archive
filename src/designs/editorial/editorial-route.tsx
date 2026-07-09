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

function DebugNote({
  children,
  enabled,
  prefix,
}: {
  children: string;
  enabled: boolean;
  prefix: string;
}) {
  if (!enabled) {
    return null;
  }

  return <small className={styles.debugNote}>{prefix} · {children}</small>;
}

function EditorialImage({
  caption,
  className = "",
  image,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 72vw",
}: {
  caption?: string;
  className?: string;
  image: ProjectImage;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <figure className={`${styles.imageFrame} ${className}`}>
      <Image
        alt={image.alt}
        className={styles.image}
        height={1000}
        priority={priority}
        sizes={sizes}
        src={image.src}
        width={1600}
      />
      <figcaption>{caption ?? image.alt}</figcaption>
    </figure>
  );
}

function EditorialContentLink({
  children,
  className,
  contentDebug,
  link,
}: {
  children?: ReactNode;
  className?: string;
  contentDebug: boolean;
  link: ContentLink;
}) {
  if (link.href.startsWith("/") && !link.href.startsWith("//")) {
    return (
      <Link
        className={className}
        href={editorialHref(link.href, contentDebug)}
      >
        {children ?? link.label}
      </Link>
    );
  }

  return (
    <a
      className={className}
      href={link.href}
      rel={link.external ? "noreferrer" : undefined}
      target={link.external ? "_blank" : undefined}
    >
      {children ?? link.label}
    </a>
  );
}

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
