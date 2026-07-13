import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import { DesignSwitcher } from "@/components/portfolio/design-switcher";
import {
  getProjectDetailLinks,
  getTemplateHref,
  isSitePageEnabled,
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

export function ProjectDetailView({ content, contentDebug, project }: DesignRouteProps) {
  const copy = content.presentation.pages.projectDetail;

  if (!project) {
    return (
      <section className={styles.contactHero}>
        <ChapterLabel index={1}>{copy.missing.eyebrow}</ChapterLabel>
        <h1>{copy.missing.title}</h1>
        <p>{copy.missing.body}</p>
        <Link className={styles.textLink} href={routeHref("/projects", contentDebug)}>
          {copy.missing.actionLabel} <span aria-hidden="true">→</span>
        </Link>
      </section>
    );
  }

  const detailSections = [
    { label: copy.sections.problem.title, body: project.problem },
    { label: copy.sections.solution.title, body: project.solution },
    { label: copy.sections.architecture.title, body: project.architecture.summary },
  ].filter((section) => section.body);
  const stackById = new Map(content.techStack.map((item) => [item.id, item]));
  const detailLinks = getProjectDetailLinks(project);
  const supportingImages = project.screenshots.filter(
    (image) => image.src !== project.screenshot.src,
  );

  return (
    <article className={styles.caseStudy}>
      <header className={styles.caseHero}>
        <Link href={routeHref("/projects", contentDebug)}>← {copy.backLabel}</Link>
        <p>{project.category} · {project.period}</p>
        <h1>{project.title}</h1>
        <p className={styles.lede}>{project.summary}</p>
        <p>{project.description}</p>
        <dl className={styles.identityList}>
          <div>
            <dt>{copy.facts.roleLabel}</dt>
            <dd>{project.role}</dd>
          </div>
          <div>
            <dt>{copy.facts.statusLabel}</dt>
            <dd>{project.deployment.label}</dd>
          </div>
        </dl>
      </header>
      <Media alt={project.screenshot.alt} priority src={project.screenshot.src} />
      <div className={styles.caseBody}>
        {detailSections.map((section, index) => (
          <section key={section.label}>
            <ChapterLabel index={index + 1}>{section.label}</ChapterLabel>
            <p>{section.body}</p>
          </section>
        ))}
        {project.architecture?.items?.length ? (
          <section>
            <ChapterLabel index={4}>{copy.sections.architecture.eyebrow}</ChapterLabel>
            <ul>{project.architecture.items.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        ) : null}
        {project.decisions.length ? (
          <section>
            <ChapterLabel index={5}>{copy.sections.decisions.title}</ChapterLabel>
            <ul>{project.decisions.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        ) : null}
        {project.highlights.length ? (
          <section>
            <ChapterLabel index={6}>{copy.sections.highlights.title}</ChapterLabel>
            <ul>{project.highlights.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        ) : null}
        {project.tradeoffs.length ? (
          <section>
            <ChapterLabel index={7}>{copy.sections.tradeoffs.title}</ChapterLabel>
            <ul>{project.tradeoffs.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        ) : null}
        {project.results.length ? (
          <section>
            <ChapterLabel index={8}>{copy.sections.result.title}</ChapterLabel>
            <ul>{project.results.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        ) : null}
        <section>
          <ChapterLabel index={9}>{copy.sections.stack.title}</ChapterLabel>
          <p className={styles.stack}>
            {project.stack
              .map((stackId) => stackById.get(stackId)?.label ?? stackId)
              .join(" · ")}
          </p>
          <LinkList
            contentDebug={contentDebug}
            links={detailLinks}
          />
        </section>
      </div>
      {supportingImages.length > 0 ? (
        <div className={styles.gallery}>
          {supportingImages.map((image) => (
            <Media alt={image.alt} key={image.src} src={image.src} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function AboutView({ content, contentDebug }: DesignRouteProps) {
  const copy = content.presentation.pages.about;
  const curation = content.curation;

  return (
    <>
      <section className={styles.textHero}>
        <ChapterLabel index={1}>{copy.hero.title}</ChapterLabel>
        <h1>{content.profile.headline}</h1>
        <p className={styles.lede}>{content.profile.summary}</p>
        <div className={styles.aboutIdentity}>
          {content.profile.photo ? (
            <Media
              alt={content.profile.photo.alt}
              src={content.profile.photo.src}
            />
          ) : null}
          <ul className={styles.profileFacts}>
            <li>{content.profile.name}</li>
            <li>{content.profile.koreanName}</li>
            <li>{content.profile.handle}</li>
            <li>{content.profile.location}</li>
          </ul>
        </div>
      </section>
      <section className={styles.essayGrid}>
        <div>
          <h2>{copy.principles.title}</h2>
          {content.profile.principles.map((principle) => (
            <article key={principle.title}><h3>{principle.title}</h3><p>{principle.body}</p></article>
          ))}
        </div>
        <div>
          <h2>{copy.skills.title}</h2>
          <div className={styles.focusGrid}>
            {content.skills.focusAreas.map((area) => (
              <article key={area.title}>
                <h3>{area.title}</h3>
                <p>{area.body}</p>
              </article>
            ))}
          </div>
          {content.skills.groups.map((group) => (
            <article key={group.title}><h3>{group.title}</h3><p>{group.items.join(" · ")}</p></article>
          ))}
        </div>
      </section>
      <section className={styles.contentSection}>
        <ChapterLabel index={2}>{copy.journey.title}</ChapterLabel>
        <div className={styles.sectionHeading}>
          <h2>{copy.journey.title}</h2>
        </div>
        <div className={styles.entryList}>
          {content.experience.map((item) => (
            <article key={`${item.period}-${item.title}`}>
              <p>{item.period}</p>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>
      {isSitePageEnabled("curation", content) ? (
        <section className={styles.contentSection}>
          <ChapterLabel index={3}>{copy.curation.title}</ChapterLabel>
          <div className={styles.sectionHeading}>
            <h2>{copy.curation.title}</h2>
            <p>{copy.curation.body}</p>
            <p>{curation.intro}</p>
          </div>
          <div className={styles.contentGrid}>
            <section>
              <h3>{copy.curation.criteriaTitle}</h3>
              <p>{curation.criteria.title}</p>
              {curation.criteria.items.map((item) => (
                <article key={item.title}>
                  <h4>{item.title}</h4>
                  <p>{item.body}</p>
                </article>
              ))}
            </section>
            <section>
              <h3>{copy.curation.categoriesTitle}</h3>
              {curation.categories.map((category) => {
                const projects = category.projectIds
                  .map((projectId) => content.projects.find((project) => project.id === projectId))
                  .filter((project): project is PortfolioProject => Boolean(project));

                return (
                  <article key={category.id}>
                    <h4>{category.label}</h4>
                    <p>{category.rationale}</p>
                    <div className={styles.evidenceLinks}>
                      {projects.map((project) => (
                        <Link
                          href={routeHref(`/projects/${project.id}`, contentDebug)}
                          key={project.id}
                        >
                          {project.title} <span aria-hidden="true">↗</span>
                        </Link>
                      ))}
                    </div>
                  </article>
                );
              })}
            </section>
            <section>
              <h3>{copy.curation.omissionsTitle}</h3>
              <p>{curation.omissions.body}</p>
              {curation.omissions.items.map((item) => (
                <article key={item.title}>
                  <h4>{item.title}</h4>
                  <p>{item.body}</p>
                </article>
              ))}
            </section>
            <section>
              <h3>{copy.curation.nextReviewTitle}</h3>
              <article>
                <h4>{curation.nextReview.title}</h4>
                <p>{curation.nextReview.body}</p>
              </article>
            </section>
          </div>
        </section>
      ) : null}
    </>
  );
}


export function ResumeView({ content, contentDebug }: DesignRouteProps) {
  const copy = content.presentation.pages.resume;
  const selected = content.resume.projectIds
    .map((id) => content.projects.find((project) => project.id === id))
    .filter((project): project is PortfolioProject => Boolean(project));

  return (
    <>
      <section className={styles.textHero}>
        <ChapterLabel index={1}>{copy.hero.title}</ChapterLabel>
        <p className={styles.kicker}>{content.profile.role}</p>
        <h1>{content.profile.name}</h1>
        <p className={styles.lede}>{copy.hero.body}</p>
        <dl className={styles.identityList}>
          <div><dt>{copy.identity.locationLabel}</dt><dd>{content.profile.location}</dd></div>
          <div><dt>{copy.identity.availabilityLabel}</dt><dd>{content.profile.availability}</dd></div>
        </dl>
        {content.resume.downloadUrl ? (
          <a className={styles.textLink} href={content.resume.downloadUrl}>
            {copy.hero.downloadLabel} <span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </section>
      <section className={styles.resumeGrid}>
        <div><h2>{copy.summary.title}</h2>{content.resume.summary.map((line) => <p key={line}>{line}</p>)}</div>
        <div>
          <h2>{copy.projects.title}</h2>
          {selected.map((project) => (
            <article key={project.id}>
              <p>{project.period} · {project.role}</p>
              <h3>{project.title}</h3>
              <p>{project.summary}</p>
              <Link href={routeHref(`/projects/${project.id}`, contentDebug)}>
                {copy.projects.caseStudyLabel}<span aria-hidden="true">↗</span>
              </Link>
            </article>
          ))}
        </div>
        <div><h2>{copy.experience.title}</h2>{content.experience.map((item) => <article key={`${item.title}-${item.period}`}><h3>{item.title}</h3><p>{item.period}</p><p>{item.body}</p></article>)}</div>
        <div><h2>{copy.training.title}</h2>{content.resume.training.map((item) => <article key={`${item.name}-${item.period}`}><h3>{item.name}</h3><p>{item.period}</p><p>{item.description}</p></article>)}</div>
        <div><h2>{copy.education.title}</h2>{content.resume.education.map((item) => <article key={`${item.name}-${item.period}`}><h3>{item.name}</h3><p>{item.period}</p><p>{item.description}</p></article>)}</div>
        <div>
          <h2>{copy.notes.title}</h2>
          {content.resume.notes.length > 0 ? (
            <ul>{content.resume.notes.map((note) => <li key={note}>{note}</li>)}</ul>
          ) : (
            <p>{content.presentation.ui.emptyStates.additionalNotes}</p>
          )}
        </div>
      </section>
    </>
  );
}

export function ContactView({ content, contentDebug }: DesignRouteProps) {
  const linksById = new Map(content.links.map((link) => [link.id, link]));
  const preferred = content.contact.preferred
    .map((id) => linksById.get(id))
    .filter((link): link is ContentLink => Boolean(link));
  const links = preferred.length > 0
    ? preferred
    : content.links.filter((link) => link.placements?.includes("contact"));

  return (
    <section className={styles.contactHero}>
      <ChapterLabel index={1}>{content.contact.title}</ChapterLabel>
      <h1>{content.contact.title}</h1>
      <p className={styles.lede}>{content.contact.intro}</p>
      <p>{content.contact.availability}</p>
      {links.length > 0 ? (
        <LinkList contentDebug={contentDebug} links={links} />
      ) : (
        <p>{content.presentation.ui.emptyStates.contactLinks}</p>
      )}
      <ul>{content.contact.notes.map((note) => <li key={note}>{note}</li>)}</ul>
    </section>
  );
}
