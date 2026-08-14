import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { AnimatedTerminal } from "@/components/portfolio/animated-terminal";
import { ContentHint } from "@/components/portfolio/content-hint";
import { ContentLinkView } from "@/components/portfolio/content-link";
import { JourneyList } from "@/components/portfolio/journey-list";
import { ProfilePhoto } from "@/components/portfolio/profile-photo";
import { ProjectCard } from "@/components/portfolio/project-card";
import { Reveal } from "@/components/portfolio/reveal";
import { SectionHeading } from "@/components/portfolio/section-heading";
import { PageShell } from "@/components/portfolio/site-shell";
import { StackList } from "@/components/portfolio/stack-list";
import { TechMarquee } from "@/components/portfolio/tech-marquee";
import {
  type HomeViewModel,
} from "@/lib/portfolio/view-models";
import {
  getTemplateHref,
  type HomeSectionId,
  type HomeTemplateId,
  type PortfolioProject,
} from "@/lib/portfolio";
import type { PreparedDesignRouteProps as DesignRouteProps } from "@/designs/shell-props";
import { createDesignShellProps } from "@/designs/shell-props";

export default function HomeRoute({
  content,
  contentDebug,
  currentPath,
}: DesignRouteProps) {
  if (content.route !== "home") return null;

  const activeTemplate = "classic";
  return (
    <HomeView
      activeTemplate={activeTemplate}
      content={content}
      contentDebug={contentDebug}
      shellProps={createDesignShellProps(
        content,
        contentDebug,
        currentPath,
        activeTemplate,
      )}
    />
  );
}

function HomeView({
  activeTemplate,
  content,
  contentDebug,
  shellProps,
}: {
  activeTemplate: HomeTemplateId;
  content: HomeViewModel;
  contentDebug: boolean;
  shellProps: ReturnType<typeof createDesignShellProps>;
}) {
  const featuredProjects = content.featuredProjects;
  const sections = content.presentation.home.classic.sections;
  return (
    <PageShell {...shellProps}>
      <ClassicHeroSection
        activeTemplate={activeTemplate}
        content={content}
        contentDebug={contentDebug}
      />
      {sections.map((sectionId) => (
        <HomeSection
          activeTemplate={activeTemplate}
          content={content}
          contentDebug={contentDebug}
          featuredProjects={featuredProjects}
          key={sectionId}
          sectionId={sectionId}
        />
      ))}
    </PageShell>
  );
}

function HomeSection({
  activeTemplate,
  content,
  contentDebug,
  featuredProjects,
  sectionId,
}: {
  activeTemplate: HomeTemplateId;
  content: HomeViewModel;
  contentDebug: boolean;
  featuredProjects: PortfolioProject[];
  sectionId: HomeSectionId;
}) {
  if (sectionId === "featured") {
    return (
      <ClassicFeaturedProjectsSection
        activeTemplate={activeTemplate}
        content={content}
        contentDebug={contentDebug}
        projects={featuredProjects}
      />
    );
  }

  if (sectionId === "workMap") {
    return <WorkMapSection content={content} contentDebug={contentDebug} />;
  }

  if (sectionId === "technicalFocus") {
    return <TechnicalFocusSection content={content} contentDebug={contentDebug} />;
  }

  if (sectionId === "stack") {
    return <SelectedStackSection content={content} contentDebug={contentDebug} />;
  }

  if (sectionId === "journey") {
    return (
      <JourneySection
        activeTemplate={activeTemplate}
        content={content}
        contentDebug={contentDebug}
      />
    );
  }

  if (sectionId === "contact") {
    return (
      <ContactPreview
        activeTemplate={activeTemplate}
        content={content}
        contentDebug={contentDebug}
      />
    );
  }

  return null;
}

function getWorkMapStats(content: HomeViewModel) {
  return {
    curriculumCount: content.metricValues.curriculumCount ?? 0,
    productCount: content.metricValues.productCount ?? 0,
    reliabilityCount: content.metricValues.reliabilityCount ?? 0,
  };
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
  const copy = content.presentation.home.classic.hero;
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
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-md border border-accent bg-accent px-4 text-sm font-semibold text-background transition hover:-translate-y-0.5 hover:bg-accent-strong focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
              href={getTemplateHref("/projects", activeTemplate, {
                contentDebug,
              })}
            >
              {copy.primaryActionLabel}
              <ArrowRightIcon />
            </Link>
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
          <Link
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-line bg-surface px-4 text-sm font-semibold text-muted transition hover:border-accent hover:text-foreground"
            href={getTemplateHref("/projects", activeTemplate, {
              contentDebug,
            })}
          >
            {copy.actionLabel}
            <ArrowRightIcon />
          </Link>
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

function WorkMapSection({
  content,
  contentDebug,
}: {
  content: HomeViewModel;
  contentDebug: boolean;
}) {
  const stats = getWorkMapStats(content);
  const copy = content.presentation.home.shared.workMap;

  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading
          body={copy.body}
          contentDebug={contentDebug}
          contentHint="src/content/presentation.json > home.shared.workMap"
          title={copy.title}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {copy.cards.map((card) => (
            <ArchiveStat
              body={card.body}
              count={stats[card.countKey]}
              key={card.id}
              label={card.label}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ArchiveStat({
  body,
  count,
  label,
}: {
  body: string;
  count: number;
  label: string;
}) {
  return (
    <Reveal>
      <article className="h-full rounded-lg border border-line bg-surface p-5">
        <p className="text-sm font-semibold text-muted">{label}</p>
        <p className="mt-4 text-5xl font-semibold text-foreground">{count}</p>
        <p className="mt-4 text-sm leading-6 text-muted">{body}</p>
      </article>
    </Reveal>
  );
}

function TechnicalFocusSection({
  content,
  contentDebug,
}: {
  content: HomeViewModel;
  contentDebug: boolean;
}) {
  const copy = content.presentation.home.shared.technicalFocus;

  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-6xl gap-9 px-5 py-20 sm:px-8">
        <SectionHeading
          body={copy.body}
          contentDebug={contentDebug}
          contentHint="src/content/presentation.json > home.shared.technicalFocus"
          title={copy.title}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {content.skills.focusAreas.map((area, index) => (
            <Reveal delay={index * 70} key={area.title}>
              <article
                className="motion-card h-full rounded-lg border border-line bg-surface p-5 transition duration-300 hover:border-accent/45 hover:bg-surface-hover"
              >
                <ContentHint
                  enabled={contentDebug}
                  path={`src/content/skills.json > focusAreas[title=${area.title}]`}
                />
                <h3 className="text-base font-semibold text-foreground">
                  {area.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted">{area.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function SelectedStackSection({
  content,
  contentDebug,
}: {
  content: HomeViewModel;
  contentDebug: boolean;
}) {
  const stackIds = new Set(content.skills.groups.flatMap((group) => group.items));
  const visibleStackItems = content.techStack.filter((item) => stackIds.has(item.id));
  const copy = content.presentation.home.shared.stack;

  return (
    <section className="border-b border-line bg-background-soft">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8">
        <div className="grid gap-9 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            body={copy.body}
            contentDebug={contentDebug}
            contentHint="src/content/presentation.json > home.shared.stack"
            title={copy.title}
          />
          <div className="grid gap-6">
            <TechMarquee
              ariaLabel={content.presentation.ui.techMarqueeAriaLabel}
              items={visibleStackItems}
            />
            <div className="grid overflow-hidden rounded-lg border border-line bg-surface sm:grid-cols-2">
              {content.skills.groups.map((group, index) => (
                <Reveal delay={index * 80} key={group.title}>
                  <div className="h-full border-b border-line p-5 sm:border-r">
                    <ContentHint
                      enabled={contentDebug}
                      path={`src/content/skills.json > groups[title=${group.title}]`}
                    />
                    <h3 className="text-sm font-semibold text-foreground">
                      {group.title}
                    </h3>
                    <div className="mt-4">
                      <StackList items={group.items} />
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function JourneySection({
  activeTemplate,
  content,
  contentDebug,
}: {
  activeTemplate: HomeTemplateId;
  content: HomeViewModel;
  contentDebug: boolean;
}) {
  const copy = content.presentation.home.shared.journey;

  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-6xl gap-9 px-5 py-20 sm:px-8">
        <SectionHeading
          body={copy.body}
          contentDebug={contentDebug}
          contentHint="src/content/presentation.json > home.shared.journey"
          title={copy.title}
        />
        <JourneyList
          animated
          caseStudyLabel={content.presentation.ui.journeyCaseStudyLabel}
          contentDebug={contentDebug}
          homeTemplate={activeTemplate}
          items={content.journey}
          variant="paired-centerline"
        />
      </div>
    </section>
  );
}

function ContactPreview({
  activeTemplate,
  content,
  contentDebug,
}: {
  activeTemplate: HomeTemplateId;
  content: HomeViewModel;
  contentDebug: boolean;
}) {
  const preferredLinks = content.preferredContactLinks;
  const copy = content.presentation.home.shared.contact;

  return (
    <section>
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <ContentHint
            enabled={contentDebug}
            path="src/content/presentation.json > home.shared.contact + src/content/contact.json > availability"
          />
          <h2 className="text-3xl font-semibold text-foreground">{copy.title}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted md:text-base">
            {content.contact.availability}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {preferredLinks.map((link) => (
            <ContentLinkView
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-surface px-4 text-sm font-semibold text-muted transition hover:border-accent hover:text-foreground"
              contentDebug={contentDebug}
              homeTemplate={activeTemplate}
              key={link.id ?? link.href}
              link={link}
            >
              {link.label}
              <ArrowRightIcon className="-rotate-45" />
            </ContentLinkView>
          ))}
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md border border-accent bg-accent px-4 text-sm font-semibold text-background transition hover:bg-accent-strong"
            href={getTemplateHref("/contact", activeTemplate, { contentDebug })}
          >
            {copy.actionLabel}
            <ArrowRightIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}
