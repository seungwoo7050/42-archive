import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { ContentHint } from "@/components/portfolio/content-hint";
import { ContentLinkView } from "@/components/portfolio/content-link";
import { ProfilePhoto } from "@/components/portfolio/profile-photo";
import { ProjectCard } from "@/components/portfolio/project-card";
import { ProjectScreenshot } from "@/components/portfolio/project-screenshot";
import { Reveal } from "@/components/portfolio/reveal";
import { SectionHeading } from "@/components/portfolio/section-heading";
import { SelectedStackSection } from "@/components/portfolio/selected-stack-section";
import { PageShell } from "@/components/portfolio/site-shell";
import { TechnicalFocusSection } from "@/components/portfolio/technical-focus-section";
import {
  getWorkMapStats,
  WorkMapSection,
} from "@/components/portfolio/work-map-section";
import {
  getFeaturedProjects,
  getTemplateHref,
  type HomeTemplateId,
  type PortfolioContent,
} from "@/lib/portfolio";

export function DesignHomeRoute({
  content,
  contentDebug,
}: {
  content: PortfolioContent;
  contentDebug: boolean;
}) {
  const activeTemplate: HomeTemplateId = "design";
  const featuredProjects = getFeaturedProjects(content);

  return (
    <PageShell
      contentDebug={contentDebug}
      homeTemplate={activeTemplate}
      profile={content.profile}
      site={content.site}
      templateSwitcher={{
        activeId: activeTemplate,
        contentDebug,
        currentPath: "/",
        templates: content.presentation.templates,
      }}
    >
      <HeroSection
        activeTemplate={activeTemplate}
        content={content}
        contentDebug={contentDebug}
        projects={featuredProjects}
      />
      {content.presentation.home.design.sections.includes("featured") ? (
        <FeaturedProjectsSection
          activeTemplate={activeTemplate}
          content={content}
          contentDebug={contentDebug}
          projects={featuredProjects}
        />
      ) : null}
      {content.presentation.home.design.sections.includes("workMap") ? (
        <WorkMapSection content={content} contentDebug={contentDebug} />
      ) : null}
      {content.presentation.home.design.sections.includes("technicalFocus") ? (
        <TechnicalFocusSection content={content} contentDebug={contentDebug} />
      ) : null}
      {content.presentation.home.design.sections.includes("stack") ? (
        <SelectedStackSection content={content} contentDebug={contentDebug} />
      ) : null}
    </PageShell>
  );
}

function FeaturedProjectsSection({
  activeTemplate,
  content,
  contentDebug,
  projects,
}: {
  activeTemplate: HomeTemplateId;
  content: PortfolioContent;
  contentDebug: boolean;
  projects: ReturnType<typeof getFeaturedProjects>;
}) {
  const copy = content.presentation.home.design.featured;

  return (
    <section className="border-b border-line bg-background-soft">
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-10 sm:px-8 md:py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            body={copy.body}
            contentDebug={contentDebug}
            contentHint="src/content/presentation.json > home.design.featured"
            title={copy.title}
          />
        </div>
        <div className="grid gap-5">
          {projects.slice(0, 1).map((project) => (
            <Reveal key={project.id}>
              <ProjectCard
                contentDebug={contentDebug}
                homeTemplate={activeTemplate}
                priority
                project={project}
                variant="featured"
              />
            </Reveal>
          ))}
          <div className="grid gap-5 lg:grid-cols-2">
            {projects.slice(1, 3).map((project, index) => (
              <Reveal delay={index * 80} key={project.id}>
                <ProjectCard
                  contentDebug={contentDebug}
                  homeTemplate={activeTemplate}
                  priority
                  project={project}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroSection({
  activeTemplate,
  content,
  contentDebug,
  projects,
}: {
  activeTemplate: HomeTemplateId;
  content: PortfolioContent;
  contentDebug: boolean;
  projects: ReturnType<typeof getFeaturedProjects>;
}) {
  const { profile } = content;
  const stats = getWorkMapStats(content);
  const copy = content.presentation.home.design.hero;
  const links = content.links.filter((link) =>
    ["github", "resume", "website"].includes(link.type),
  );
  const leadProject = projects[0];
  const supportingProjects = projects.slice(1, 3);

  return (
    <section className="hero-section border-b border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 md:py-16 lg:min-h-[calc(88vh-4rem)] lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
        <Reveal className="max-w-3xl">
          <ContentHint
            enabled={contentDebug}
            path="src/content/profile.json > name/koreanName/photo/role/headline/summary + src/content/presentation.json > home.design.hero"
          />
          <div className="flex items-center gap-4">
            {profile.photo ? <ProfilePhoto photo={profile.photo} /> : null}
            <p className="text-sm font-medium text-muted">
              {profile.name} · {profile.koreanName}
            </p>
          </div>
          <h1 className="mt-6 text-5xl font-semibold leading-[0.98] tracking-normal text-foreground sm:text-6xl md:text-7xl">
            {profile.role}
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-foreground md:text-2xl md:leading-9">
            {profile.headline}
          </p>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
            {profile.summary}
          </p>
          <dl className="mt-8 grid max-w-xl grid-cols-3 overflow-hidden rounded-lg border border-line bg-surface/80">
            {copy.stats.map((stat, index) => (
              <div
                className={
                  index < copy.stats.length - 1 ? "border-r border-line p-4" : "p-4"
                }
                key={stat.label}
              >
                <dt className="text-xs font-semibold uppercase text-muted">
                  {stat.label}
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-foreground">
                  {stats[stat.countKey]}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-9 flex flex-wrap gap-3">
            {links.map((link) => (
              <ContentLinkView
                className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-surface px-4 text-sm font-semibold text-muted transition hover:-translate-y-0.5 hover:border-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
                contentDebug={contentDebug}
                homeTemplate={activeTemplate}
                key={link.id ?? link.href}
                link={link}
              >
                {link.label}
                <ArrowRightIcon className="-rotate-45" />
              </ContentLinkView>
            ))}
          </div>
        </Reveal>
        {leadProject ? (
          <Reveal className="hero-showcase">
            <div className="hero-showcase-frame">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div>
                  <ContentHint
                    enabled={contentDebug}
                    path={`src/content/presentation.json > home.design.hero.leadLabel/leadActionLabel + src/content/projects.json > projects[id=${leadProject.id}]`}
                  />
                  <p className="text-xs font-semibold uppercase text-muted">
                    {copy.leadLabel}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">
                    {leadProject.title}
                  </h2>
                </div>
                <Link
                  className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm font-semibold text-muted transition hover:border-accent hover:text-foreground"
                  href={getTemplateHref(`/projects/${leadProject.id}`, activeTemplate, {
                    contentDebug,
                  })}
                >
                  {copy.leadActionLabel}
                  <ArrowRightIcon />
                </Link>
              </div>
              <div className="group p-4">
                <ProjectScreenshot image={leadProject.screenshot} priority />
              </div>
              <div className="grid gap-3 border-t border-line p-4 sm:grid-cols-2">
                {supportingProjects.map((project) => (
                  <Link
                    className="rounded-lg border border-line bg-surface-soft p-3 transition hover:border-accent hover:bg-surface"
                    href={getTemplateHref(`/projects/${project.id}`, activeTemplate, {
                      contentDebug,
                    })}
                    key={project.id}
                  >
                    <p className="text-xs font-semibold uppercase text-muted">
                      {project.category}
                    </p>
                    <h3 className="mt-2 text-base font-semibold text-foreground">
                      {project.title}
                    </h3>
                    <p className="mt-2 text-sm leading-5 text-muted">
                      {project.summary}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
