import Link from "next/link";
import { ArrowUpRightIcon } from "@/components/icons";
import {
  getTemplateHref,
  type HomeTemplateId,
  type PortfolioProject,
} from "@/lib/portfolio";
import { AvailabilityBadge } from "./availability-badge";
import { ContentHint } from "./content-hint";
import { ProjectCardLinks } from "./project-links";
import { ProjectScreenshot } from "./project-screenshot";
import { StackList } from "./stack-list";

export function ProjectCard({
  contentDebug,
  homeTemplate,
  priority = false,
  project,
  variant = "default",
}: {
  contentDebug?: boolean;
  homeTemplate?: HomeTemplateId;
  priority?: boolean;
  project: PortfolioProject;
  variant?: "default" | "featured";
}) {
  const isFeatured = variant === "featured";
  const caseStudyHref = getTemplateHref(`/projects/${project.id}`, homeTemplate, {
    contentDebug,
  });

  return (
    <article
      className={`project-card motion-card group grid gap-5 rounded-lg border border-line bg-surface p-3 transition duration-300 hover:border-accent/50 hover:bg-surface-hover ${
        isFeatured ? "lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch" : ""
      }`}
    >
      <Link
        aria-label={`${project.title} case study`}
        className="block focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
        href={caseStudyHref}
      >
        <ProjectScreenshot image={project.screenshot} priority={priority} />
      </Link>
      <div className={`grid gap-4 px-1 pb-1 ${isFeatured ? "lg:p-5" : ""}`}>
        <ContentHint
          enabled={contentDebug}
          path={`src/content/projects.json > projects[id=${project.id}]`}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            {project.category}
          </p>
          <AvailabilityBadge project={project} />
        </div>
        <div>
          <Link
            className="group/title inline-flex items-center gap-2 text-xl font-semibold text-foreground hover:text-accent-strong"
            href={caseStudyHref}
          >
            {project.title}
            <ArrowUpRightIcon className="opacity-0 transition group-hover/title:opacity-100" />
          </Link>
          <p className="mt-2 text-sm leading-6 text-muted">{project.summary}</p>
        </div>
        <StackList items={project.stack} limit={isFeatured ? 6 : 4} />
        <ul className="grid gap-2 border-t border-line pt-4">
          {project.highlights.slice(0, 2).map((highlight) => (
            <li className="text-sm leading-6 text-muted" key={highlight}>
              {highlight}
            </li>
          ))}
        </ul>
        <ProjectCardLinks
          contentDebug={contentDebug}
          homeTemplate={homeTemplate}
          project={project}
        />
      </div>
    </article>
  );
}
