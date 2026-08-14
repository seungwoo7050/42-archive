import { ArrowRightIcon } from "@/components/icons";
import { AnimatedTerminal } from "@/components/portfolio/animated-terminal";
import { ContentHint } from "@/components/portfolio/content-hint";
import { ContentLinkView } from "@/components/portfolio/content-link";
import { HomeContactPreview } from "@/components/portfolio/home-contact-preview";
import { HomeJourneySection } from "@/components/portfolio/home-journey-section";
import { ProfilePhoto } from "@/components/portfolio/profile-photo";
import { ProjectCard } from "@/components/portfolio/project-card";
import { Reveal } from "@/components/portfolio/reveal";
import { SectionHeading } from "@/components/portfolio/section-heading";
import { SelectedStackSection } from "@/components/portfolio/selected-stack-section";
import { PageShell } from "@/components/portfolio/site-shell";
import { TechnicalFocusSection } from "@/components/portfolio/technical-focus-section";
import { WorkMapSection } from "@/components/portfolio/work-map-section";
import {
  type HomeTemplateId,
  type PortfolioProject,
} from "@/lib/portfolio";
import type { HomeViewModel } from "@/lib/portfolio/view-models";

export function ClassicHomeRoute({
  content,
  contentDebug,
}: {
  content: HomeViewModel;
  contentDebug: boolean;
}) {
  const activeTemplate: HomeTemplateId = "classic";
  const featuredProjects = content.featuredProjects;

  return (
    <PageShell
      contentDebug={contentDebug}
      homeTemplate={activeTemplate}
      profile={content.profile}
      site={content.site}
      ui={content.presentation.ui}
      templateSwitcher={{
        activeId: activeTemplate,
        contentDebug,
        currentPath: "/",
        templates: content.presentation.templates,
      }}
    >
      <ClassicHeroSection
        activeTemplate={activeTemplate}
        content={content}
        contentDebug={contentDebug}
      />
      {content.presentation.home.classic.sections.includes("featured") ? (
        <ClassicFeaturedProjectsSection
          activeTemplate={activeTemplate}
          content={content}
          contentDebug={contentDebug}
          projects={featuredProjects}
        />
      ) : null}
      {content.presentation.home.classic.sections.includes("workMap") ? (
        <WorkMapSection content={content} contentDebug={contentDebug} />
      ) : null}
      {content.presentation.home.classic.sections.includes("technicalFocus") ? (
        <TechnicalFocusSection content={content} contentDebug={contentDebug} />
      ) : null}
      {content.presentation.home.classic.sections.includes("stack") ? (
        <SelectedStackSection content={content} contentDebug={contentDebug} />
      ) : null}
      {content.presentation.home.classic.sections.includes("journey") ? (
        <HomeJourneySection
          activeTemplate={activeTemplate}
          content={content}
          contentDebug={contentDebug}
        />
      ) : null}
      {content.presentation.home.classic.sections.includes("contact") ? (
        <HomeContactPreview
          activeTemplate={activeTemplate}
          content={content}
          contentDebug={contentDebug}
        />
      ) : null}
    </PageShell>
  );
}

function ClassicFeaturedProjectsSection({
  activeTemplate,
  content,
  contentDebug,
  projects,
}: {
  activeTemplate: HomeTemplateId;
  content: HomeViewModel;
  contentDebug: boolean;
  projects: PortfolioProject[];
}) {
  const copy = content.presentation.home.classic.featured;

  return (
    <section className="border-b border-line bg-background-soft">
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-10 sm:px-8 md:py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            body={copy.body}
            contentDebug={contentDebug}
            contentHint="src/content/presentation.json > home.classic.featured"
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
        </div>
      </div>
    </section>
  );
}

function ClassicHeroSection({
  activeTemplate,
  content,
  contentDebug,
}: {
  activeTemplate: HomeTemplateId;
  content: HomeViewModel;
  contentDebug: boolean;
}) {
  const { profile } = content;
  const links = content.heroLinks;

  return (
    <section className="hero-section border-b border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 md:py-16 lg:min-h-[calc(88vh-4rem)] lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <Reveal className="max-w-3xl">
          <ContentHint
            enabled={contentDebug}
            path="src/content/profile.json > name/koreanName/photo/role/headline/summary + src/content/presentation.json > home.classic.hero"
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
        <div className="hero-terminal-wrap">
          <ContentHint
            enabled={contentDebug}
            path="src/content/presentation.json > home.classic.terminal"
          />
          <AnimatedTerminal
            ariaLabel={content.presentation.ui.animatedTerminalAriaLabel}
            profile={profile}
            projectCount={content.projectCount}
            stackCount={content.techStack.length}
            terminal={content.presentation.home.classic.terminal}
          />
        </div>
      </div>
    </section>
  );
}
