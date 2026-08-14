import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { AvailabilityBadge } from "@/components/portfolio/availability-badge";
import { ContentHint } from "@/components/portfolio/content-hint";
import { ProjectLinks } from "@/components/portfolio/project-links";
import { ProjectScreenshot } from "@/components/portfolio/project-screenshot";
import {
  getTemplateHref,
  type HomeTemplateId,
  type ProjectDetailPageContent,
  type PortfolioProject,
} from "@/lib/portfolio";

export function ProjectHero({
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
