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
  const shellCopy = content.presentation.brutalist.shell;
  const ui = content.presentation.ui;
  const footerLinks = content.links.filter((link) =>
    link.placements?.includes("footer"),
  );

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
        <nav
          aria-label={ui.primaryNavigationAriaLabel}
          className={styles.navigation}
        >
          <ol className={styles.navigationList}>
            {content.site.navigation.map((item, index) => (
              <li key={`${item.href}-${item.label}`}>
                <Link
                  aria-current={
                    isCurrentNavigation(item.href, currentPath) ? "page" : undefined
                  }
                  className={styles.navigationLink}
                  href={brutalistHref(item.href, contentDebug)}
                >
                  <span className={styles.navigationIndex}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>
        <details className={styles.mobileMenu}>
          <summary>{ui.menuLabel}</summary>
          <nav aria-label={ui.mobileNavigationAriaLabel}>
            {content.site.navigation.map((item, index) => (
              <Link
                aria-current={
                  isCurrentNavigation(item.href, currentPath) ? "page" : undefined
                }
                href={brutalistHref(item.href, contentDebug)}
                key={`${item.href}-mobile`}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </details>
      </header>
      {contentDebug ? (
        <aside className={styles.debugBanner} role="status">
          <strong>{shellCopy.debugLabel}</strong>
          <span>
            {ui.debugPrefix}: {shellCopy.debugHint}
          </span>
        </aside>
      ) : null}
      <main className={styles.main} id="brutalist-main">
        {children}
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerLead}>
          <span className={styles.footerSymbol} aria-hidden="true">
            ↳
          </span>
          <p>{content.site.footer.note}</p>
        </div>
        <div className={styles.footerMeta}>
          <span>{content.site.footer.copyright}</span>
          {footerLinks.map((link) => (
            <ActionLink
              className=""
              contentDebug={contentDebug}
              href={link.href}
              isExternal={link.external}
              key={link.id ?? `${link.type}-${link.href}`}
            >
              {link.label} <span aria-hidden="true">↗</span>
            </ActionLink>
          ))}
        </div>
      </footer>
    </div>
  );
}

export function HomeView({
  content,
  contentDebug,
}: {
  content: PortfolioContent;
  contentDebug: boolean;
}) {
  const homeCopy = content.presentation.home.brutalist;
  const metrics = getHomeMetrics(content);
  return (
    <>
      {homeCopy.sections.map((section) => {
        switch (section) {
          case "hero":
            return (
              <section className={styles.homeHero} key={section}>
                <div className={styles.heroStamp}>
                  <span>
                    {homeCopy.stampLabel} / {new Date().getFullYear()}
                  </span>
                  <span>{content.profile.availability}</span>
                </div>
                <div className={styles.heroCopy}>
                  <p className={styles.eyebrow}>{content.profile.role}</p>
                  <h1 className={styles.megaTitle}>
                    <span>{content.profile.name}</span>
                    <span className={styles.megaTitleAccent}>
                      {content.profile.handle}
                    </span>
                  </h1>
                  <p className={styles.heroHeadline}>{content.profile.headline}</p>
                </div>
                <div className={styles.heroSummary}>
                  <p>{content.profile.summary}</p>
                  <div className={styles.actionRow}>
                    <Link
                      className={styles.primaryAction}
                      href={brutalistHref("/projects", contentDebug)}
                    >
                      {homeCopy.hero.primaryActionLabel}{" "}
                      <span aria-hidden="true">↗</span>
                    </Link>
                    <Link
                      className={styles.secondaryAction}
                      href={brutalistHref("/contact", contentDebug)}
                    >
                      {homeCopy.hero.secondaryActionLabel}
                    </Link>
                  </div>
                </div>
                <dl className={styles.metricsGrid}>
                  {metrics.map((metric, index) => (
                    <div className={styles.metricBlock} key={metric.id}>
                      <dt>
                        {String(index + 1).padStart(2, "0")} / {metric.label}
                      </dt>
                      <dd>{String(metric.value).padStart(2, "0")}</dd>
                      {metric.description ? <p>{metric.description}</p> : null}
                    </div>
                  ))}
                </dl>
              </section>
            );
        }
      })}
    </>
  );
}

export function ActionLink({
  children,
  className,
  contentDebug,
  href,
  isExternal,
}: {
  children: React.ReactNode;
  className: string;
  contentDebug: boolean;
  href: string;
  isExternal?: boolean;
}) {
  const external = isExternal || /^https?:\/\//.test(href) || href.startsWith("mailto:");

  if (external) {
    return (
      <a
        className={className}
        href={href}
        rel={href.startsWith("mailto:") ? undefined : "noreferrer"}
        target={href.startsWith("mailto:") ? undefined : "_blank"}
      >
        {children}
      </a>
    );
  }

  return (
    <Link className={className} href={brutalistHref(href, contentDebug)}>
      {children}
    </Link>
  );
}
