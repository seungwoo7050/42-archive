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
          case "contact":
            return (
              <section className={styles.contactStrip} key={section}>
                <p>{content.contact.availability}</p>
                <h2>{content.contact.title}</h2>
                <div>
                  {preferredLinks.slice(0, 3).map((link) => (
                    <EditorialContentLink
                      className={styles.contactStripLink}
                      contentDebug={contentDebug}
                      key={link.id ?? link.href}
                      link={link}
                    >
                      {link.label} <Arrow />
                    </EditorialContentLink>
                  ))}
                </div>
              </section>
            );
        }
      })}
    </>
  );
}

function ProjectsRoute({ content, contentDebug }: EditorialRouteProps) {
  const projects = content.projects;
  const grouped = content.projectGroups
    .map((group) => ({
      group,
      items: projects.filter((project) => project.groupId === group.id),
    }))
    .filter(({ items }) => items.length > 0);
  const copy = content.presentation.pages.projects.editorial;
  const ui = content.presentation.ui;

  return (
    <>
      <section className={styles.pageHero}>
        <div className={styles.pageHeroNumber}>01</div>
        <div>
          <DebugNote enabled={contentDebug} prefix={ui.debugPrefix}>
            projects.json / presentation.pages.projects
          </DebugNote>
          <h1>{copy.hero.title}</h1>
        </div>
        <p>{copy.hero.body}</p>
      </section>

      <section className={styles.archiveOverview} aria-label={copy.archiveAriaLabel}>
        {content.projectMetrics.map((metric) => (
          <div key={metric.id}>
            <strong>{getProjectMetricValue(metric.id, content)}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </section>

      <div className={styles.archiveSections}>
        {grouped.length > 0 ? grouped.map(({ group, items }, groupIndex) => (
          <section className={styles.archiveGroup} key={group.id}>
            <header>
              <span>
                {copy.groupKickerTemplate.replace(
                  "{number}",
                  twoDigits(groupIndex),
                )}
              </span>
              <h2>{group.label}</h2>
              <p>{group.description}</p>
            </header>
            <div className={styles.projectIndex}>
              {items.map((project) => (
                <ProjectIndexItem
                  contentDebug={contentDebug}
                  key={project.id}
                  project={project}
                  readCaseStudyAriaTemplate={ui.readCaseStudyAriaTemplate}
                />
              ))}
            </div>
          </section>
        )) : (
          <p className={styles.emptyCopy}>{ui.emptyStates.projectsArchive}</p>
        )}
      </div>
    </>
  );
}

function EvidenceList({
  emptyLabel,
  items,
  ordered = false,
}: {
  emptyLabel: string;
  items: string[];
  ordered?: boolean;
}) {
  if (items.length === 0) {
    return <p className={styles.emptyCopy}>{emptyLabel}</p>;
  }

  const List = ordered ? "ol" : "ul";

  return (
    <List className={styles.evidenceList}>
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>
          <span>{twoDigits(index)}</span>
          <p>{item}</p>
        </li>
      ))}
    </List>
  );
}
function ProjectDetailRoute({ content, contentDebug, project }: EditorialRouteProps) {
  const copy = content.presentation.pages.projectDetail;
  const ui = content.presentation.ui;

  if (!project) {
    return (
      <section className={styles.missingPage}>
        <p className={styles.overline}>{copy.missing.eyebrow}</p>
        <h1>{copy.missing.title}</h1>
        <p>{copy.missing.body}</p>
        <Link href={editorialHref("/projects", contentDebug)}>
          {copy.missing.actionLabel}
        </Link>
      </section>
    );
  }

  const supportingImages = project.screenshots.filter(
    (image) => image.src !== project.screenshot.src,
  );
  const detailLinks = getProjectDetailLinks(project);
  const stackById = new Map(content.techStack.map((item) => [item.id, item]));

  return (
    <article className={styles.caseStudy}>
      <header className={styles.caseHero}>
        <div className={styles.caseMetaRail}>
          <Link href={editorialHref("/projects", contentDebug)}>
            ← {copy.backLabel}
          </Link>
          <span>{project.category}</span>
          <span>{project.period}</span>
          <span>{copy.facts.roleLabel} · {project.role}</span>
          <span>{copy.facts.statusLabel} · {project.deployment.label}</span>
        </div>
        <div className={styles.caseTitle}>
          <DebugNote enabled={contentDebug} prefix={ui.debugPrefix}>
            {`projects.items[id=${project.id}]`}
          </DebugNote>
          <p>{copy.caseLabel} {project.order} · {project.role}</p>
          <h1>{project.title}</h1>
          <p className={styles.caseStandfirst}>{project.summary}</p>
        </div>
        <p className={styles.caseDescription}>{project.description}</p>
        {detailLinks.length > 0 ? (
          <nav
            aria-label={ui.projectNavigationAriaLabel}
            className={styles.caseLinks}
          >
            {detailLinks.map((link) => (
              <EditorialContentLink
                contentDebug={contentDebug}
                key={`${link.type}-${link.href}`}
                link={link}
              >
                {link.label} <Arrow />
              </EditorialContentLink>
            ))}
          </nav>
        ) : null}
      </header>

      <div className={styles.caseCover}>
        <EditorialImage image={project.screenshot} priority sizes="100vw" />
      </div>

      <section className={styles.caseNarrative}>
        <aside>
          <span>I</span>
          <p>{copy.sections.problem.eyebrow}</p>
        </aside>
        <div>
          <h2>{copy.sections.problem.title}</h2>
          <p className={styles.dropcap}>{project.problem}</p>
        </div>
        <div>
          <p className={styles.overline}>{copy.sections.solution.eyebrow}</p>
          <h2>{copy.sections.solution.title}</h2>
          <p>{project.solution}</p>
        </div>
      </section>

      <section className={styles.architectureSpread}>
        <div className={styles.darkSectionTitle}>
          <span>II</span>
          <p>{copy.sections.architecture.eyebrow}</p>
          <h2>{copy.sections.architecture.title}</h2>
        </div>
        <div className={styles.architectureBody}>
          <p>{project.architecture.summary}</p>
          <EvidenceList
            emptyLabel={ui.emptyStates.additionalNotes}
            items={project.architecture.items}
            ordered
          />
        </div>
        <aside>
          <span>{copy.sections.stack.eyebrow}</span>
          <p>{copy.sections.stack.title}</p>
          <ul>
            {project.stack.map((stackId) => (
              <li key={stackId}>
                {stackById.get(stackId)?.label ?? stackId}
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </article>
  );
}
