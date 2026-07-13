import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import { DesignSwitcher } from "@/components/portfolio/design-switcher";
import {
  getTemplateHref,
  type ContentLink,
  type PortfolioProject,
} from "@/lib/portfolio";
import type { DesignRouteProps } from "@/designs/types";
import styles from "./cinematic.module.css";

export function routeHref(href: string, contentDebug = false) {
  return getTemplateHref(href, "cinematic", { contentDebug });
}

export function isCurrentNavigation(href: string, currentPath: string) {
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function CinematicLink({
  children,
  className,
  contentDebug,
  external,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  contentDebug: boolean;
  external?: boolean;
  href: string;
}) {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link className={className} href={routeHref(href, contentDebug)}>
        {children}
      </Link>
    );
  }

  const opensNewTab = external || href.startsWith("http://") || href.startsWith("https://");

  return (
    <a
      className={className}
      href={href}
      rel={opensNewTab ? "noreferrer" : undefined}
      target={opensNewTab ? "_blank" : undefined}
    >
      {children}
    </a>
  );
}

export function LinkList({
  contentDebug,
  links,
}: {
  contentDebug: boolean;
  links: ContentLink[];
}) {
  return (
    <div className={styles.linkList}>
      {links.filter((link) => link.enabled !== false).map((link) => {
        const children = (
          <>
            {link.label}
            <span aria-hidden="true">↗</span>
          </>
        );

        return (
          <CinematicLink
            contentDebug={contentDebug}
            external={link.external}
            href={link.href}
            key={link.id ?? `${link.label}-${link.href}`}
          >
            {children}
          </CinematicLink>
        );
      })}
    </div>
  );
}

export function Frame({
  children,
  content,
  contentDebug,
  currentPath,
}: DesignRouteProps & { children: React.ReactNode }) {
  const footerLinks = content.links.filter((link) =>
    link.placements?.includes("footer"),
  );
  const ui = content.presentation.ui;

  return (
    <div className={styles.site} data-site-design="cinematic">
      <a className={styles.skipLink} href="#cinematic-content">
        {ui.skipLinkLabel}
      </a>
      <header className={styles.header}>
        <Link className={styles.brand} href={routeHref("/", contentDebug)}>
          <span>{content.site.brand}</span>
          <small>{content.presentation.cinematic.shell.brandSubtitle}</small>
        </Link>
        <nav aria-label={ui.primaryNavigationAriaLabel} className={styles.desktopNav}>
          {content.site.navigation.map((item) => (
            <Link
              aria-current={isCurrentNavigation(item.href, currentPath) ? "page" : undefined}
              href={routeHref(item.href, contentDebug)}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.switcher}>
          <DesignSwitcher
            activeId="cinematic"
            contentDebug={contentDebug}
            currentPath={currentPath}
            templates={content.presentation.templates}
            ui={ui}
          />
        </div>
        <details className={styles.mobileNav}>
          <summary>{ui.menuLabel}</summary>
          <nav aria-label={ui.mobileNavigationAriaLabel}>
            {content.site.navigation.map((item) => (
              <Link
                aria-current={isCurrentNavigation(item.href, currentPath) ? "page" : undefined}
                href={routeHref(item.href, contentDebug)}
                key={`${item.href}-mobile`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </details>
      </header>
      <main id="cinematic-content">{children}</main>
      <footer className={styles.footer}>
        <p>{content.site.footer.note}</p>
        {footerLinks.length > 0 ? (
          <LinkList contentDebug={contentDebug} links={footerLinks} />
        ) : null}
        <p>{content.site.footer.copyright}</p>
      </footer>
    </div>
  );
}

export function Media({
  alt,
  priority = false,
  src,
}: {
  alt: string;
  priority?: boolean;
  src: string;
}) {
  return (
    <figure className={styles.media}>
      <Image alt={alt} fill priority={priority} sizes="(max-width: 900px) 100vw, 72vw" src={src} />
    </figure>
  );
}

export function ChapterLabel({ children, index }: { children: React.ReactNode; index: number }) {
  return (
    <p className={styles.chapterLabel}>
      <span>{String(index).padStart(2, "0")}</span>
      {children}
    </p>
  );
}

export function ProjectChapter({
  actionLabel,
  index,
  openItemAriaTemplate,
  priority,
  project,
  contentDebug,
}: {
  actionLabel: string;
  contentDebug: boolean;
  index: number;
  openItemAriaTemplate: string;
  priority?: boolean;
  project: PortfolioProject;
}) {
  return (
    <article className={styles.projectChapter}>
      <div className={styles.stickyCopy}>
        <ChapterLabel index={index}>{project.category}</ChapterLabel>
        <h2>{project.title}</h2>
        <p>{project.summary}</p>
        <Link className={styles.textLink} href={routeHref(`/projects/${project.id}`, contentDebug)}>
          {actionLabel} <span aria-hidden="true">→</span>
        </Link>
      </div>
      <Link
        aria-label={openItemAriaTemplate.replace("{title}", project.title)}
        href={routeHref(`/projects/${project.id}`, contentDebug)}
      >
        <Media alt={project.screenshot.alt} priority={priority} src={project.screenshot.src} />
      </Link>
    </article>
  );
}

export function HomeView({ content, contentDebug }: DesignRouteProps) {
  const featured = content.projects.filter((project) => project.featured);
  const lead = featured[0] ?? content.projects[0];
  const copy = content.presentation.home.cinematic;
  const ui = content.presentation.ui;
  const sectionNodes: Record<(typeof copy.sections)[number], React.ReactNode> = {
    hero: (
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>{content.profile.name} · {content.profile.location}</p>
          <h1>{content.profile.role}</h1>
          <p className={styles.lede}>{content.profile.headline}</p>
          <p className={styles.summary}>{content.profile.summary}</p>
          <div className={styles.heroActions}>
            <Link href={routeHref("/projects", contentDebug)}>{copy.hero.primaryActionLabel}</Link>
            <Link href={routeHref("/contact", contentDebug)}>{copy.hero.secondaryActionLabel}</Link>
          </div>
        </div>
        {lead ? (
          <div className={styles.heroMedia}>
            <Media alt={lead.screenshot.alt} priority src={lead.screenshot.src} />
            <p>{lead.title} · {lead.period}</p>
          </div>
        ) : null}
      </section>
    ),
    statement: (
      <section className={styles.statement}>
        <ChapterLabel index={1}>{copy.statementLabel}</ChapterLabel>
        <p>{content.presentation.home.shared.technicalFocus.body}</p>
      </section>
    ),
    projects: (
      <section className={styles.chapters}>
        {(featured.length > 0 ? featured : content.projects.slice(0, 4)).map(
          (project, index) => (
            <ProjectChapter
              actionLabel={copy.caseStudyActionLabel}
              contentDebug={contentDebug}
              index={index + 2}
              key={project.id}
              openItemAriaTemplate={ui.openItemAriaTemplate}
              project={project}
            />
          ),
        )}
      </section>
    ),
    focusContact: (
      <section className={styles.dualPanel}>
        <div>
          <ChapterLabel index={featured.length + 2}>{copy.focusLabel}</ChapterLabel>
          <h2>{content.presentation.home.shared.technicalFocus.title}</h2>
          <div className={styles.focusGrid}>
            {content.skills.focusAreas.map((area) => (
              <article key={area.title}>
                <h3>{area.title}</h3>
                <p>{area.body}</p>
              </article>
            ))}
          </div>
        </div>
        <div>
          <ChapterLabel index={featured.length + 3}>{ui.nowLabel}</ChapterLabel>
          <h2>{content.contact.title}</h2>
          <p>{content.contact.availability}</p>
          <Link className={styles.textLink} href={routeHref("/contact", contentDebug)}>
            {copy.contactActionLabel} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    ),
  };

  return (
    <>
      {copy.sections.map((sectionId) => (
        <Fragment key={sectionId}>{sectionNodes[sectionId]}</Fragment>
      ))}
    </>
  );
}

export function ProjectsView({ content, contentDebug }: DesignRouteProps) {
  const copy = content.presentation.pages.projects.cinematic.hero;
  const homeCopy = content.presentation.home.cinematic;

  return (
    <>
      <section className={styles.indexHero}>
        <p>{copy.eyebrow} / {String(content.projects.length).padStart(2, "0")} {copy.entryLabel}</p>
        <h1>{copy.title}</h1>
        <p className={styles.indexSummary}>{copy.body}</p>
      </section>
      <section className={styles.chapters}>
        {content.projects.map((project, index) => (
          <ProjectChapter
            actionLabel={homeCopy.caseStudyActionLabel}
            contentDebug={contentDebug}
            index={index + 1}
            key={project.id}
            openItemAriaTemplate={content.presentation.ui.openItemAriaTemplate}
            priority={index === 0}
            project={project}
          />
        ))}
      </section>
    </>
  );
}
