import Image from "next/image";
import Link from "next/link";
import { DesignSwitcher } from "@/components/portfolio/design-switcher";
import {
  getContentLinksByPlacement,
  getPreferredContactLinks,
  getProjectDetailLinks,
  getProjectMetricValue,
  getTemplateHref,
  isSitePageEnabled,
  type ContentLink,
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
  const ui = content.presentation.ui;
  const featured = content.projects.filter((project) => project.featured);
  const selected = (featured.length > 0 ? featured : content.projects).slice(0, 5);
  const metrics = getHomeMetrics(content);
  const recentJourney = content.journey.slice(-4).reverse();

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
          case "signal":
            return <SignalStrip key={section} text={homeCopy.signalText} />;
          case "featured":
            return (
              <section className={styles.section} key={section}>
                <SectionHeader
                  body={homeCopy.featured.body}
                  number="01"
                  title={homeCopy.featured.title}
                />
                {selected.length > 0 ? (
                  <ol className={styles.projectIndex}>
                    {selected.map((project) => (
                      <ProjectIndexRow
                        contentDebug={contentDebug}
                        key={project.id}
                        project={project}
                      />
                    ))}
                  </ol>
                ) : (
                  <EmptyBlock message={ui.emptyStates.projectsHome} />
                )}
                <Link
                  className={styles.fullWidthAction}
                  href={brutalistHref("/projects", contentDebug)}
                >
                  {homeCopy.featured.actionLabel}{" "}
                  ({String(content.projects.length).padStart(2, "0")})
                  <span aria-hidden="true">→</span>
                </Link>
              </section>
            );
          case "system":
            return (
              <section
                className={`${styles.section} ${styles.blueSection}`}
                key={section}
              >
                <SectionHeader
                  body={homeCopy.system.body}
                  number="02"
                  title={homeCopy.system.title}
                />
                <div className={styles.principleGrid}>
                  {content.profile.principles.map((principle, index) => (
                    <article className={styles.principleCard} key={principle.title}>
                      <span className={styles.cardNumber}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h3>{principle.title}</h3>
                      <p>{principle.body}</p>
                    </article>
                  ))}
                </div>
                <div className={styles.stackWall} aria-label={homeCopy.system.title}>
                  {content.techStack.slice(0, 18).map((item) => (
                    <span key={item.id}>{item.label}</span>
                  ))}
                </div>
              </section>
            );
          case "journey":
            return (
              <section className={styles.section} key={section}>
                <SectionHeader
                  body={content.presentation.home.shared.journey.body}
                  number="03"
                  title={content.presentation.home.shared.journey.title}
                />
                {recentJourney.length > 0 ? (
                  <ol className={styles.compactTimeline}>
                    {recentJourney.map((item, index) => (
                      <li key={`${item.date}-${item.title}`}>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <time>
                          {item.endDate ? `${item.date}—${item.endDate}` : item.date}
                        </time>
                        <strong>{item.title}</strong>
                        <p>{item.body}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <EmptyBlock message={ui.emptyStates.journey} />
                )}
                <Link
                  className={styles.fullWidthAction}
                  href={brutalistHref("/journey", contentDebug)}
                >
                  {homeCopy.journeyActionLabel}{" "}
                  <span aria-hidden="true">→</span>
                </Link>
              </section>
            );
          case "contact":
            return (
              <ContactBand
                content={content}
                contentDebug={contentDebug}
                key={section}
              />
            );
        }
      })}
    </>
  );
}

export function SignalStrip({ text }: { text: string }) {
  return (
    <div aria-hidden="true" className={styles.signalStrip}>
      <div>
        <span>{text}</span>
        <span>{text}</span>
      </div>
    </div>
  );
}

export function SectionHeader({
  body,
  number,
  title,
}: {
  body?: string;
  number: string;
  title: string;
}) {
  return (
    <header className={styles.sectionHeader}>
      <span className={styles.sectionNumber}>{number}</span>
      <h2>{title}</h2>
      {body ? <p>{body}</p> : <span aria-hidden="true" />}
    </header>
  );
}

export function ProjectIndexRow({
  contentDebug,
  project,
}: {
  contentDebug: boolean;
  project: PortfolioProject;
}) {
  return (
    <li className={styles.projectIndexItem}>
      <Link href={brutalistHref(`/projects/${project.id}`, contentDebug)}>
        <span className={styles.projectIndexNumber}>
          {project.order}
        </span>
        <span className={styles.projectIndexMain}>
          <span className={styles.projectIndexMeta}>
            {project.category} / {project.period}
          </span>
          <strong>{project.title}</strong>
          <span className={styles.projectIndexSummary}>{project.summary}</span>
        </span>
        <span className={styles.projectTags}>
          {getProjectTags(project).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </span>
        <span className={styles.projectIndexArrow} aria-hidden="true">
          ↗
        </span>
      </Link>
    </li>
  );
}


export function ProjectsView({
  content,
  contentDebug,
}: {
  content: PortfolioContent;
  contentDebug: boolean;
}) {
  const groups = groupProjects(content);
  const pageCopy = content.presentation.pages.projects;
  const brutalistCopy = pageCopy.brutalist;
  const metrics = getHomeMetrics(content);

  return (
    <>
      <section className={styles.pageHero}>
        <PageLabel index="01" label={brutalistCopy.hero.eyebrow} />
        <h1>{brutalistCopy.hero.title}</h1>
        <p>{brutalistCopy.hero.body}</p>
        <dl className={styles.inlineMetrics}>
          {metrics.slice(0, 3).map((metric) => (
            <div key={metric.id}>
              <dt>{metric.label}</dt>
              <dd>{String(metric.value).padStart(2, "0")}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className={styles.groupArchive}>
        {groups.length > 0 ? (
          groups.map((group, groupIndex) => (
            <section className={styles.projectGroup} key={group.id}>
              <header className={styles.projectGroupHeader}>
                <span>{String(groupIndex + 1).padStart(2, "0")}</span>
                <h2>{group.label}</h2>
                <p>{group.description}</p>
                <strong>{String(group.projects.length).padStart(2, "0")}</strong>
              </header>
              <ol className={styles.groupProjectList}>
                {group.projects.map((project) => (
                  <ProjectIndexRow
                    contentDebug={contentDebug}
                    key={project.id}
                    project={project}
                  />
                ))}
              </ol>
            </section>
          ))
        ) : (
          <EmptyBlock
            message={content.presentation.ui.emptyStates.projectsArchive}
          />
        )}
      </div>

      <ContactBand content={content} contentDebug={contentDebug} />
    </>
  );
}

export function ProjectDetailView({
  content,
  contentDebug,
  project,
}: {
  content: PortfolioContent;
  contentDebug: boolean;
  project?: PortfolioProject;
}) {
  const copy = content.presentation.pages.projectDetail;

  if (!project) {
    return (
      <section className={styles.notFound}>
        <span>{copy.missing.eyebrow}</span>
        <h1>{copy.missing.title}</h1>
        <p>{copy.missing.body}</p>
        <Link
          className={styles.primaryAction}
          href={brutalistHref("/projects", contentDebug)}
        >
          {copy.missing.actionLabel}
        </Link>
      </section>
    );
  }

  const screenshots = project.screenshots;

  return (
    <>
      <article>
        <header className={styles.detailHero}>
          <div className={styles.detailHeroCopy}>
            <Link
              className={styles.backLink}
              href={brutalistHref("/projects", contentDebug)}
            >
              ← {copy.backLabel}
            </Link>
            <p className={styles.eyebrow}>
              {project.order} / {project.category} / {project.period}
            </p>
            <h1>{project.title}</h1>
            <p className={styles.detailLead}>{project.summary}</p>
            <dl className={styles.detailFacts}>
              <div>
                <dt>{copy.facts.roleLabel}</dt>
                <dd>{project.role}</dd>
              </div>
              <div>
                <dt>{copy.facts.statusLabel}</dt>
                <dd>{project.deployment.label}</dd>
              </div>
            </dl>
            <ProjectActions
              contentDebug={contentDebug}
              links={getProjectDetailLinks(project)}
            />
          </div>
          <ProjectMedia image={project.screenshot} priority />
        </header>

        <div className={styles.detailIntro}>
          <span>{copy.caseLabel} / {project.id}</span>
          <p>{project.description}</p>
        </div>

        <div className={styles.detailBody}>
          <DetailTextSection
            body={project.problem}
            eyebrow={copy.sections.problem.eyebrow}
            number="01"
            title={copy.sections.problem.title}
          />
          <DetailTextSection
            body={project.solution}
            eyebrow={copy.sections.solution.eyebrow}
            number="02"
            title={copy.sections.solution.title}
          />
          <DetailListSection
            emptyMessage={content.presentation.ui.emptyStates.projectDetails}
            eyebrow={copy.sections.architecture.eyebrow}
            intro={project.architecture.summary}
            items={project.architecture.items}
            number="03"
            title={copy.sections.architecture.title}
          />
          {screenshots.length > 0 ? (
            <section className={styles.detailSection}>
              <SectionHeader
                number="04"
                title={copy.sections.screenshots.title}
              />
              <div className={styles.galleryGrid}>
                {screenshots.map((image, index) => (
                  <ProjectMedia
                    image={image}
                    key={`${image.src}-${index}`}
                    label={`${copy.frameLabel} ${String(index + 1).padStart(2, "0")}`}
                  />
                ))}
              </div>
            </section>
          ) : null}
          <section className={styles.detailSection}>
            <SectionHeader number="05" title={copy.sections.stack.title} />
            <div className={styles.stackWall}>
              {project.stack.map((stackId) => {
                const stack = content.techStack.find((item) => item.id === stackId);
                return <span key={stackId}>{stack!.label}</span>;
              })}
            </div>
          </section>
          <DetailListSection
            emptyMessage={content.presentation.ui.emptyStates.projectDetails}
            eyebrow={copy.sections.highlights.eyebrow}
            items={project.highlights}
            number="06"
            title={copy.sections.highlights.title}
          />
          <DetailListSection
            emptyMessage={content.presentation.ui.emptyStates.projectDetails}
            eyebrow={copy.sections.decisions.eyebrow}
            items={project.decisions}
            number="07"
            title={copy.sections.decisions.title}
          />
          <DetailListSection
            emptyMessage={content.presentation.ui.emptyStates.projectDetails}
            eyebrow={copy.sections.tradeoffs.eyebrow}
            items={project.tradeoffs}
            number="08"
            title={copy.sections.tradeoffs.title}
            tone="yellow"
          />
          <DetailListSection
            emptyMessage={content.presentation.ui.emptyStates.projectDetails}
            eyebrow={copy.sections.result.eyebrow}
            items={project.results}
            number="09"
            title={copy.sections.result.title}
            tone="blue"
          />
        </div>
      </article>
      <nav
        aria-label={content.presentation.ui.projectNavigationAriaLabel}
        className={styles.nextProject}
      >
        <span>{copy.outroLabel}</span>
        <Link href={brutalistHref("/projects", contentDebug)}>
          {copy.returnToIndexLabel} <span aria-hidden="true">→</span>
        </Link>
      </nav>
    </>
  );
}

export function ProjectMedia({
  image,
  label,
  priority = false,
}: {
  image: PortfolioProject["screenshot"];
  label?: string;
  priority?: boolean;
}) {
  return (
    <figure className={styles.mediaFrame}>
      {label ? <figcaption>{label}</figcaption> : null}
      <div className={styles.mediaInner}>
        <Image
          alt={image.alt}
          fill
          priority={priority}
          sizes="(max-width: 900px) 100vw, 55vw"
          src={image.src}
        />
      </div>
    </figure>
  );
}

export function ProjectActions({
  contentDebug,
  links,
}: {
  contentDebug: boolean;
  links: ContentLink[];
}) {
  if (links.length === 0) {
    return null;
  }

  return (
    <div className={styles.actionRow}>
      {links.map((link, index) => (
        <ActionLink
          className={index === 0 ? styles.primaryAction : styles.secondaryAction}
          contentDebug={contentDebug}
          href={link.href}
          isExternal={link.external}
          key={`${link.type}-${link.href}`}
        >
          {link.label} <span aria-hidden="true">↗</span>
        </ActionLink>
      ))}
    </div>
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

export function DetailTextSection({
  body,
  eyebrow,
  number,
  title,
}: {
  body: string;
  eyebrow: string;
  number: string;
  title: string;
}) {
  return (
    <section className={styles.detailSection}>
      <SectionHeader number={number} title={title} />
      <div className={styles.detailTextBlock}>
        <span>{eyebrow}</span>
        <p>{body}</p>
      </div>
    </section>
  );
}


export function DetailListSection({
  emptyMessage,
  eyebrow,
  intro,
  items,
  number,
  title,
  tone,
}: {
  emptyMessage: string;
  eyebrow?: string;
  intro?: string;
  items: string[];
  number: string;
  title: string;
  tone?: "blue" | "yellow";
}) {
  return (
    <section className={styles.detailSection}>
      <SectionHeader number={number} title={title} />
      {eyebrow ? <p className={styles.detailSectionLabel}>{eyebrow}</p> : null}
      {intro ? <p className={styles.detailSectionIntro}>{intro}</p> : null}
      {items.length > 0 ? (
        <ol
          className={`${styles.detailList} ${
            tone === "blue"
              ? styles.detailListBlue
              : tone === "yellow"
                ? styles.detailListYellow
                : ""
          }`}
        >
          {items.map((item, index) => (
            <li key={`${index}-${item}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{item}</p>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyBlock message={emptyMessage} />
      )}
    </section>
  );
}


export function AboutView({
  content,
  contentDebug,
}: {
  content: PortfolioContent;
  contentDebug: boolean;
}) {
  const pageCopy = content.presentation.pages.about;
  const brutalistCopy = pageCopy.brutalist;
  const curation = content.curation;
  const showCuration = isSitePageEnabled("curation", content);

  return (
    <>
      <section className={styles.pageHero}>
        <PageLabel
          index="01"
          label={renderCopyTemplate(brutalistCopy.heroEyebrowTemplate, {
            handle: content.profile.handle,
          })}
        />
        <h1>{pageCopy.hero.title}</h1>
        <p>{content.profile.summary}</p>
        <div className={styles.profileAside}>
          <div className={styles.heroIdentity}>
            <strong>{content.profile.name}</strong>
            <span>{content.profile.koreanName}</span>
            <span>{content.profile.handle}</span>
            <span>{content.profile.location}</span>
            <span>{content.profile.role}</span>
          </div>
          {content.profile.photo ? (
            <figure className={styles.profilePortrait}>
              <Image
                alt={content.profile.photo.alt}
                fill
                sizes="(max-width: 720px) 100vw, 28vw"
                src={content.profile.photo.src}
              />
            </figure>
          ) : null}
        </div>
      </section>

      <section className={`${styles.section} ${styles.yellowSection}`}>
        <SectionHeader number="02" title={pageCopy.principles.title} />
        <div className={styles.principleGrid}>
          {content.profile.principles.map((principle, index) => (
            <article className={styles.principleCard} key={principle.title}>
              <span className={styles.cardNumber}>
                {brutalistCopy.principleItemLabel}{" "}
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{principle.title}</h3>
              <p>{principle.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeader number="03" title={pageCopy.skills.title} />
        <div className={styles.skillGrid}>
          {content.skills.focusAreas.map((area, index) => (
            <article className={styles.focusCard} key={area.title}>
              <span>
                {brutalistCopy.focusItemLabel} /{" "}
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{area.title}</h3>
              <p>{area.body}</p>
            </article>
          ))}
          {content.skills.groups.map((group) => (
            <article className={styles.skillCard} key={group.title}>
              <h3>{group.title}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {content.experience.length > 0 ? (
        <section className={`${styles.section} ${styles.blueSection}`}>
          <SectionHeader number="04" title={pageCopy.journey.title} />
          <div className={styles.resumeEntries}>
            {content.experience.map((item) => (
              <article key={`${item.period}-${item.title}`}>
                <time>{item.period}</time>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {showCuration ? (
        <section className={`${styles.section} ${styles.curationSection}`}>
          <SectionHeader
            body={pageCopy.curation.body}
            number="05"
            title={pageCopy.curation.title}
          />
          <p className={styles.curationIntro}>{curation.intro}</p>

          <CurationHeading
            label={pageCopy.curation.criteriaTitle}
            title={curation.criteria.title}
          />
          <div className={styles.criteriaGrid}>
            {curation.criteria.items.map((item, index) => (
              <article key={item.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>

          <CurationHeading title={pageCopy.curation.categoriesTitle} />
          <div className={styles.curationCategories}>
            {curation.categories.map((category) => {
              const projects = category.projectIds
                .map((id) =>
                  content.projects.find((project) => project.id === id),
                )
                .filter((item): item is PortfolioProject => Boolean(item));

              return (
                <article key={category.id}>
                  <h3>{category.label}</h3>
                  <p>{category.rationale}</p>
                  {projects.length > 0 ? (
                    <ul>
                      {projects.map((project) => (
                        <li key={project.id}>
                          <Link
                            href={brutalistHref(
                              `/projects/${project.id}`,
                              contentDebug,
                            )}
                          >
                            {project.title} <span aria-hidden="true">↗</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className={styles.omissionGrid}>
            <div>
              <span>{pageCopy.curation.omissionsTitle}</span>
              <h3>{curation.omissions.title}</h3>
              <p>{curation.omissions.body}</p>
            </div>
            <ul>
              {curation.omissions.items.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </li>
              ))}
            </ul>
          </div>

          <aside className={styles.nextReview}>
            <span>{pageCopy.curation.nextReviewTitle}</span>
            <div>
              <h3>{curation.nextReview.title}</h3>
              <p>{curation.nextReview.body}</p>
            </div>
          </aside>
        </section>
      ) : null}

      <ContactBand content={content} contentDebug={contentDebug} />
    </>
  );
}


export function ResumeView({
  content,
  contentDebug,
}: {
  content: PortfolioContent;
  contentDebug: boolean;
}) {
  const copy = content.presentation.pages.resume;
  const resumeProjects = content.resume.projectIds
    .map((projectId) => content.projects.find((project) => project.id === projectId))
    .filter((item): item is PortfolioProject => Boolean(item));

  return (
    <>
      <section className={`${styles.pageHero} ${styles.resumeHero}`}>
        <PageLabel
          index="01"
          label={renderCopyTemplate(copy.brutalist.heroEyebrowTemplate, {
            name: content.profile.name,
          })}
        />
        <h1>{copy.hero.title}</h1>
        <p>{copy.hero.body}</p>
        <div className={styles.heroIdentity}>
          <strong>{content.profile.role}</strong>
          <span>
            {copy.identity.locationLabel}: {content.profile.location}
          </span>
          <span>
            {copy.identity.availabilityLabel}: {content.profile.availability}
          </span>
        </div>
        {content.resume.downloadUrl ? (
          <ActionLink
            className={styles.primaryAction}
            contentDebug={contentDebug}
            href={content.resume.downloadUrl}
          >
            {copy.hero.downloadLabel} ↗
          </ActionLink>
        ) : null}
      </section>

      <section className={styles.resumeSection}>
        <header>
          <span>02</span>
          <h2>{copy.summary.title}</h2>
        </header>
        <div className={styles.resumeSummary}>
          {content.resume.summary.map((item, index) => (
            <p key={`${index}-${item}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item}
            </p>
          ))}
        </div>
      </section>

      {content.experience.length > 0 ? (
        <section className={styles.resumeSection}>
          <header>
            <span>03</span>
            <h2>{copy.experience.title}</h2>
          </header>
          <div className={styles.resumeEntries}>
            {content.experience.map((item) => (
              <article key={`${item.period}-${item.title}`}>
                <time>{item.period}</time>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className={`${styles.resumeSection} ${styles.blueSection}`}>
        <header>
          <span>04</span>
          <h2>{copy.projects.title}</h2>
        </header>
        <ol className={styles.resumeProjects}>
          {resumeProjects.map((project, index) => (
            <li key={project.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p>{project.period} / {project.role}</p>
                <h3>{project.title}</h3>
                <p>{project.summary}</p>
              </div>
              <Link
                aria-label={renderCopyTemplate(
                  content.presentation.ui.readCaseStudyAriaTemplate,
                  { title: project.title },
                )}
                href={brutalistHref(`/projects/${project.id}`, contentDebug)}
              >
                ↗
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.resumeSection}>
        <header>
          <span>05</span>
          <h2>{copy.training.title}</h2>
        </header>
        <div className={styles.resumeEntries}>
          {content.resume.training.map((item) => (
            <article key={`${item.period}-${item.name}`}>
              <time>{item.period}</time>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.resumeSection}>
        <header>
          <span>06</span>
          <h2>{copy.education.title}</h2>
        </header>
        <div className={styles.resumeEntries}>
          {content.resume.education.map((item) => (
            <article key={`${item.period}-${item.name}`}>
              <time>{item.period}</time>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <aside className={styles.resumeNotes}>
        <strong>{copy.notes.title}</strong>
        {content.resume.notes.length > 0 ? (
          <ul>
            {content.resume.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : (
          <p>{content.presentation.ui.emptyStates.additionalNotes}</p>
        )}
      </aside>
    </>
  );
}

export function ContactView({
  content,
  contentDebug,
}: {
  content: PortfolioContent;
  contentDebug: boolean;
}) {
  const copy = content.presentation.pages.contact;
  const preferred = getPreferredContactLinks(content);
  const visibleLinks =
    preferred.length > 0
      ? preferred
      : getContentLinksByPlacement("contact", content);

  return (
    <>
      <section className={styles.contactHero}>
        <PageLabel index="01" label={copy.brutalist.heroEyebrow} />
        <h1>{content.contact.title}</h1>
        <p>{content.contact.intro}</p>
        <span className={styles.contactAvailability}>
          <span aria-hidden="true" /> {content.contact.availability}
        </span>
      </section>

      <section className={styles.contactGrid}>
        <div className={styles.contactHeading}>
          <span>02</span>
          <h2>{copy.availability.title}</h2>
          <p>{content.profile.availability}</p>
        </div>
        <ol className={styles.contactLinks}>
          {visibleLinks.length > 0 ? (
            visibleLinks.map((link, index) => (
              <li key={link.id ?? link.href}>
                <ActionLink
                  className={styles.contactLink}
                  contentDebug={contentDebug}
                  href={link.href}
                  isExternal={link.external}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{link.label}</strong>
                  <span aria-hidden="true">↗</span>
                </ActionLink>
              </li>
            ))
          ) : (
            <li className={styles.contactEmpty}>
              <EmptyBlock
                message={content.presentation.ui.emptyStates.contactLinks}
              />
            </li>
          )}
        </ol>
      </section>

      <section className={`${styles.section} ${styles.yellowSection}`}>
        <SectionHeader number="03" title={copy.notes.title} />
        <ul className={styles.notesList}>
          {content.contact.notes.map((note, index) => (
            <li key={note}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{note}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export function JourneyView({
  content,
  contentDebug,
}: {
  content: PortfolioContent;
  contentDebug: boolean;
}) {
  const copy = content.presentation.pages.journey;
  const narrative = content.journeyNarrative;
  return (
    <>
      <section className={styles.pageHero}>
        <PageLabel index="01" label={copy.hero.eyebrow} />
        <h1>{copy.hero.title}</h1>
        <p>{narrative.intro}</p>
      </section>

      <section className={`${styles.section} ${styles.yellowSection}`}>
        <SectionHeader
          body={copy.narrative.body}
          number="02"
          title={copy.narrative.title}
        />
        {narrative.milestones.length > 0 ? (
          <ol className={styles.milestoneList}>
            {narrative.milestones.map((milestone, index) => {
            const projects = milestone.anchorProjectIds
              .map((id) => content.projects.find((project) => project.id === id))
              .filter((item): item is PortfolioProject => Boolean(item));

            return (
              <li key={milestone.id}>
                <header>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <time>{milestone.date}</time>
                  <h3>{milestone.title}</h3>
                </header>
                <dl>
                  <div>
                    <dt>{copy.narrative.labels.state}</dt>
                    <dd>{milestone.state}</dd>
                  </div>
                  <div>
                    <dt>{copy.narrative.labels.reason}</dt>
                    <dd>{milestone.reason}</dd>
                  </div>
                  <div>
                    <dt>{copy.narrative.labels.result}</dt>
                    <dd>{milestone.result}</dd>
                  </div>
                </dl>
                {projects.length > 0 ? (
                  <div className={styles.anchorLinks}>
                    {projects.map((project) => (
                      <Link
                        href={brutalistHref(`/projects/${project.id}`, contentDebug)}
                        key={project.id}
                      >
                        {project.title} ↗
                      </Link>
                    ))}
                  </div>
                ) : null}
              </li>
            );
            })}
          </ol>
        ) : (
          <EmptyBlock message={content.presentation.ui.emptyStates.journey} />
        )}
      </section>
    </>
  );
}

export function PageLabel({ index, label }: { index: string; label: string }) {
  return (
    <p className={styles.pageLabel}>
      <span>{index}</span>
      {label}
    </p>
  );
}

export function CurationHeading({
  label,
  title,
}: {
  label?: string;
  title: string;
}) {
  return (
    <header className={styles.curationHeading}>
      {label ? <span>{label}</span> : null}
      <h3 className={label ? undefined : styles.curationHeadingWide}>{title}</h3>
    </header>
  );
}


export function ContactBand({
  content,
  contentDebug,
}: {
  content: PortfolioContent;
  contentDebug: boolean;
}) {
  return (
    <section className={styles.contactBand}>
      <span>
        {content.presentation.ui.nowLabel} / {content.profile.location}
      </span>
      <h2>{content.contact.title}</h2>
      <p>{content.contact.availability}</p>
      <Link href={brutalistHref("/contact", contentDebug)}>
        {content.presentation.home.brutalist.contactActionLabel}{" "}
        <span aria-hidden="true">↗</span>
      </Link>
    </section>
  );
}

export function EmptyBlock({ message }: { message: string }) {
  return (
    <div className={styles.emptyBlock} role="status">
      <span aria-hidden="true">□</span>
      <p>{message}</p>
    </div>
  );
}
