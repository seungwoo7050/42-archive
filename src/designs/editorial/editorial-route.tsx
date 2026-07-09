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

function SectionKicker({ children, number }: { children: ReactNode; number: string }) {
  return (
    <div className={styles.sectionKicker}>
      <span>{number}</span>
      <p>{children}</p>
    </div>
  );
}

function ProjectIndexItem({
  contentDebug,
  project,
  readCaseStudyAriaTemplate,
}: {
  contentDebug: boolean;
  project: PortfolioProject;
  readCaseStudyAriaTemplate: string;
}) {
  const tags = getProjectTags(project);

  return (
    <article className={styles.projectIndexItem}>
      <span className={styles.projectOrdinal}>{project.order}</span>
      <div className={styles.projectIndexTitle}>
        <p>{project.category}</p>
        <h3>
          <Link href={editorialHref(`/projects/${project.id}`, contentDebug)}>
            {project.title}
          </Link>
        </h3>
      </div>
      <p className={styles.projectIndexSummary}>
        {project.summary}
      </p>
      <div className={styles.projectIndexMeta}>
        <span>{project.period}</span>
        <span>{project.deployment.label}</span>
        {tags.length > 0 ? <span>{tags.slice(0, 3).join(" · ")}</span> : null}
      </div>
      <Link
        aria-label={readCaseStudyAriaTemplate.replace("{title}", project.title)}
        className={styles.indexArrow}
        href={editorialHref(`/projects/${project.id}`, contentDebug)}
      >
        <Arrow />
      </Link>
    </article>
  );
}

function HomeRoute({ content, contentDebug }: EditorialRouteProps) {
  const projects = content.projects;
  const featured = projects.filter((project) => project.featured);
  const selected = featured.length > 0 ? featured : projects.slice(0, 4);
  const lead = selected[0];
  const preferredLinks = getPreferredContactLinks(content);
  const homeCopy = content.presentation.home.editorial;
  const sharedCopy = content.presentation.home.shared;
  const ui = content.presentation.ui;

  return (
    <>
      {homeCopy.sections.map((section) => {
        switch (section) {
          case "hero":
            return (
              <section className={styles.homeHero} key={section}>
                <div className={styles.heroIssue}>
                  <span>
                    {homeCopy.hero.issueTemplate.replace(
                      "{year}",
                      String(new Date().getFullYear()),
                    )}
                  </span>
                  <span>{content.profile.location}</span>
                </div>
                <div className={styles.heroTitleBlock}>
                  <DebugNote
                    enabled={contentDebug}
                    prefix={ui.debugPrefix}
                  >
                    profile.json
                  </DebugNote>
                  <p className={styles.heroRole}>{content.profile.role}</p>
                  <h1>{content.profile.headline}</h1>
                </div>
                <p className={styles.heroSummary}>{content.profile.summary}</p>
                <div className={styles.heroByline}>
                  {content.profile.photo ? (
                    <Image
                      alt={content.profile.photo.alt}
                      className={styles.portrait}
                      height={160}
                      priority
                      src={content.profile.photo.src}
                      width={160}
                    />
                  ) : (
                    <span className={styles.portraitFallback} aria-hidden="true">
                      {content.profile.name.slice(0, 1)}
                    </span>
                  )}
                  <div>
                    <strong>{content.profile.name}</strong>
                    <span>{content.profile.availability}</span>
                  </div>
                </div>
                <Link
                  className={styles.heroAction}
                  href={editorialHref("/projects", contentDebug)}
                >
                  {homeCopy.hero.primaryActionLabel} <Arrow />
                </Link>
              </section>
            );
          case "lead":
            return (
              <section className={styles.leadStory} key={section}>
                <SectionKicker number="01">{homeCopy.lead.label}</SectionKicker>
                {lead ? (
                  <div className={styles.leadStoryGrid}>
                    <div className={styles.leadStoryCopy}>
                      <p className={styles.overline}>
                        {lead.category} · {lead.period}
                      </p>
                      <h2>
                        <Link href={editorialHref(`/projects/${lead.id}`, contentDebug)}>
                          {lead.title}
                        </Link>
                      </h2>
                      <p className={styles.standfirst}>{lead.summary}</p>
                      <p>{lead.description}</p>
                      <ul className={styles.inlineFacts}>
                        {lead.highlights.slice(0, 3).map((highlight) => (
                          <li key={highlight}>{highlight}</li>
                        ))}
                      </ul>
                    </div>
                    <Link
                      aria-label={ui.openItemAriaTemplate.replace(
                        "{title}",
                        lead.title,
                      )}
                      className={styles.leadVisualLink}
                      href={editorialHref(`/projects/${lead.id}`, contentDebug)}
                    >
                      <EditorialImage image={lead.screenshot} priority />
                      <span>{homeCopy.lead.actionLabel} <Arrow /></span>
                    </Link>
                  </div>
                ) : (
                  <p className={styles.emptyCopy}>{ui.emptyStates.projectsHome}</p>
                )}
              </section>
            );
          case "featured":
            return (
              <section className={styles.selectedStories} key={section}>
                <SectionKicker number="02">{homeCopy.featured.title}</SectionKicker>
                <div className={styles.projectIndex}>
                  {selected.length > 0 ? (
                    selected.slice(lead ? 1 : 0, 5).map((project) => (
                      <ProjectIndexItem
                        contentDebug={contentDebug}
                        key={project.id}
                        project={project}
                        readCaseStudyAriaTemplate={ui.readCaseStudyAriaTemplate}
                      />
                    ))
                  ) : (
                    <p className={styles.emptyCopy}>{ui.emptyStates.projectsHome}</p>
                  )}
                </div>
              </section>
            );
          case "principles":
            return (
              <section className={styles.editorialColumns} key={section}>
                <div className={styles.columnFeature}>
                  <SectionKicker number="03">
                    {content.presentation.pages.about.principles.title}
                  </SectionKicker>
                  <div className={styles.principleList}>
                    {content.profile.principles.map((principle, index) => (
                      <article key={`${principle.title}-${index}`}>
                        <span>{twoDigits(index)}</span>
                        <h3>{principle.title}</h3>
                        <p>{principle.body}</p>
                      </article>
                    ))}
                  </div>
                </div>
                <aside className={styles.sidebarFeature}>
                  <p className={styles.sidebarLabel}>{sharedCopy.journey.title}</p>
                  <h2>{content.journeyNarrative.currentPosition.title}</h2>
                  <p>{content.journeyNarrative.currentPosition.body}</p>
                  <Link href={editorialHref("/journey", contentDebug)}>
                    {homeCopy.current.actionLabel} <Arrow />
                  </Link>
                  <div className={styles.sidebarRule} />
                  <p className={styles.sidebarLabel}>{sharedCopy.stack.title}</p>
                  <ul className={styles.textTags}>
                    {content.techStack.slice(0, 9).map((item) => (
                      <li key={item.id}>{item.label}</li>
                    ))}
                  </ul>
                </aside>
              </section>
            );
        }
      })}
    </>
  );
}
