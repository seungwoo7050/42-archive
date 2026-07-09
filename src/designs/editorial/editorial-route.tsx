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

function EditorialShell({
  children,
  content,
  contentDebug,
  currentPath,
  route,
}: EditorialRouteProps & { children: ReactNode }) {
  const primaryNavigation = content.site.navigation;
  const ui = content.presentation.ui;
  const shellCopy = content.presentation.editorial.shell;
  const footerLinks = content.links.filter((link) =>
    link.placements?.includes("footer"),
  );

  return (
    <div className={styles.root} data-site-design="editorial">
      <a className={styles.skipLink} href="#editorial-main">
        {ui.skipLinkLabel}
      </a>
      <header className={styles.masthead}>
        <div className={styles.mastheadRule}>
          <span>{shellCopy.kicker}</span>
          <span aria-hidden="true">{shellCopy.volumeLabel} {routeNumbers[route]}</span>
        </div>
        <div className={styles.mastheadMain}>
          <Link
            className={styles.wordmark}
            href={editorialHref("/", contentDebug)}
          >
            <span>{content.profile.name}</span>
            <small>{content.profile.role}</small>
          </Link>
          <nav aria-label={ui.primaryNavigationAriaLabel} className={styles.desktopNav}>
            {primaryNavigation.map((item, index) => (
              <Link
                aria-current={
                  isCurrentNavigation(item.href, currentPath) ? "page" : undefined
                }
                className={styles.navLink}
                href={editorialHref(item.href, contentDebug)}
                key={`${item.href}-${index}`}
              >
                <span>{twoDigits(index)}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className={styles.switcherSlot}>
            <DesignSwitcher
              activeId={DESIGN_ID}
              contentDebug={contentDebug}
              currentPath={currentPath}
              templates={content.presentation.templates}
              ui={ui}
            />
          </div>
          <details className={styles.mobileMenu}>
            <summary>{ui.menuLabel}</summary>
            <nav aria-label={ui.mobileNavigationAriaLabel}>
              {primaryNavigation.map((item, index) => (
                <Link
                  aria-current={
                    isCurrentNavigation(item.href, currentPath)
                      ? "page"
                      : undefined
                  }
                  href={editorialHref(item.href, contentDebug)}
                  key={`${item.href}-mobile-${index}`}
                >
                  <span>{twoDigits(index)}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </header>
      <main id="editorial-main">{children}</main>
      <footer className={styles.footer}>
        <div className={styles.footerLead}>
          <p>{content.site.footer.note}</p>
          {footerLinks.map((link) => (
            <EditorialContentLink
              contentDebug={contentDebug}
              key={link.id ?? link.href}
              link={link}
            >
              {link.label} <Arrow />
            </EditorialContentLink>
          ))}
        </div>
        <div className={styles.footerFineprint}>
          <span>{content.site.footer.copyright}</span>
          <span>
            {content.profile.location} · {content.profile.handle}
          </span>
        </div>
      </footer>
    </div>
  );
}
