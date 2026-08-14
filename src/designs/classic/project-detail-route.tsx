import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { AvailabilityBadge } from "@/components/portfolio/availability-badge";
import { ContentHint } from "@/components/portfolio/content-hint";
import { ProjectLinks } from "@/components/portfolio/project-links";
import { ProjectScreenshot } from "@/components/portfolio/project-screenshot";
import { PageShell } from "@/components/portfolio/site-shell";
import { StackList } from "@/components/portfolio/stack-list";
import {
  getTemplateHref,
  type HomeTemplateId,
  type ProjectDetailPageContent,
  type PortfolioProject,
} from "@/lib/portfolio";
import { createDesignShellProps } from "@/designs/shell-props";
import type { PreparedDesignRouteProps as DesignRouteProps } from "@/designs/shell-props";

export default function ProjectDetailRoute({
  content,
  contentDebug,
  currentPath,
}: DesignRouteProps) {
  if (content.route !== "project-detail") return null;

  const activeTemplate = "classic";
  const shellProps = createDesignShellProps(
    content,
    contentDebug,
    currentPath,
    activeTemplate,
  );
  const project = content.project;
  const pageCopy = content.presentation.pages.projectDetail;

  return (
    <PageShell {...shellProps}>
      <ProjectHero
        contentDebug={contentDebug}
        homeTemplate={activeTemplate}
        pageCopy={pageCopy}
        project={project}
      />
      <ProjectBody
        contentDebug={contentDebug}
        pageCopy={pageCopy}
        project={project}
      />
    </PageShell>
  );
}

function ProjectHero({
  contentDebug,
  homeTemplate,
  pageCopy,
  project,
}: {
  contentDebug: boolean;
  homeTemplate: HomeTemplateId;
  pageCopy: ProjectDetailPageContent;
  project: PortfolioProject;
}) {
  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-foreground"
            href={getTemplateHref("/projects", homeTemplate, { contentDebug })}
          >
            <ArrowRightIcon className="rotate-180" />
            {pageCopy.backLabel}
          </Link>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ContentHint
              enabled={contentDebug}
              path={`src/content/projects.json > projects[id=${project.id}]`}
            />
            <span className="text-sm font-medium text-muted">
              {project.category} · {project.period}
            </span>
            <AvailabilityBadge project={project} />
          </div>
          <h1 className="mt-5 text-5xl font-semibold leading-tight text-foreground md:text-6xl">
            {project.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-foreground">
            {project.summary}
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
            {project.description}
          </p>
          <div className="mt-8">
            <ProjectLinks
              contentDebug={contentDebug}
              excludeCaseStudy
              homeTemplate={homeTemplate}
              project={project}
            />
          </div>
        </div>
        <div className="group">
          <ProjectScreenshot image={project.screenshot} priority />
        </div>
      </div>
    </section>
  );
}

function ProjectBody({
  contentDebug,
  pageCopy,
  project,
}: {
  contentDebug: boolean;
  pageCopy: ProjectDetailPageContent;
  project: PortfolioProject;
}) {
  const { sections } = pageCopy;

  return (
    <div className="mx-auto grid max-w-6xl gap-14 px-5 py-16 sm:px-8">
      <ContentHint
        enabled={contentDebug}
        path={`src/content/presentation.json > pages.projectDetail.sections + src/content/projects.json > projects[id=${project.id}] detail fields`}
      />
      <TwoColumnSection
        body={project.problem}
        eyebrow={sections.problem.eyebrow}
        title={sections.problem.title}
      />
      <TwoColumnSection
        body={project.solution}
        eyebrow={sections.solution.eyebrow}
        title={sections.solution.title}
      />
      <section className="grid gap-6 lg:grid-cols-[0.42fr_0.58fr]">
        <SectionTitle
          eyebrow={sections.architecture.eyebrow}
          title={sections.architecture.title}
        />
        <div className="rounded-lg border border-line bg-surface p-6">
          <p className="text-base leading-7 text-foreground">
            {project.architecture.summary}
          </p>
          <ul className="mt-6 grid gap-3">
            {project.architecture.items.map((item) => (
              <li className="border-l border-line pl-4 text-sm leading-6 text-muted" key={item}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-[0.42fr_0.58fr]">
        <SectionTitle
          eyebrow={sections.screenshots.eyebrow}
          title={sections.screenshots.title}
        />
        <div className="grid gap-4">
          {project.screenshots.map((image) => (
            <div className="group" key={image.src}>
              <ProjectScreenshot image={image} />
            </div>
          ))}
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-[0.42fr_0.58fr]">
        <SectionTitle
          eyebrow={sections.stack.eyebrow}
          title={sections.stack.title}
        />
        <div className="rounded-lg border border-line bg-surface p-6">
          <StackList items={project.stack} />
        </div>
      </section>
      <ListSection
        eyebrow={sections.decisions.eyebrow}
        items={project.decisions}
        title={sections.decisions.title}
      />
      <ListSection
        eyebrow={sections.highlights.eyebrow}
        items={project.highlights}
        title={sections.highlights.title}
      />
      <ListSection
        eyebrow={sections.tradeoffs.eyebrow}
        items={project.tradeoffs}
        title={sections.tradeoffs.title}
      />
      <ListSection
        eyebrow={sections.result.eyebrow}
        items={project.results}
        title={sections.result.title}
      />
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-semibold text-foreground">{title}</h2>
    </div>
  );
}

function TwoColumnSection({
  body,
  eyebrow,
  title,
}: {
  body: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="grid gap-6 lg:grid-cols-[0.42fr_0.58fr]">
      <SectionTitle eyebrow={eyebrow} title={title} />
      <p className="text-base leading-7 text-muted">{body}</p>
    </section>
  );
}

function ListSection({
  eyebrow,
  items,
  title,
}: {
  eyebrow: string;
  items: string[];
  title: string;
}) {
  return (
    <section className="grid gap-6 lg:grid-cols-[0.42fr_0.58fr]">
      <SectionTitle eyebrow={eyebrow} title={title} />
      <ul className="grid gap-3">
        {items.map((item) => (
          <li
            className="rounded-lg border border-line bg-surface p-4 text-sm leading-6 text-muted"
            key={item}
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
