import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { ContentHint } from "@/components/portfolio/content-hint";
import {
  getTemplateHref,
  type HomeTemplateId,
  type PresentationContent,
} from "@/lib/portfolio";
import type { JourneyMilestoneViewModel } from "@/lib/portfolio/view-models";

export function MilestoneCard({
  contentDebug,
  homeTemplate,
  index,
  labels,
  milestone,
}: {
  contentDebug: boolean;
  homeTemplate: HomeTemplateId;
  index: number;
  labels: PresentationContent["pages"]["journey"]["narrative"]["labels"];
  milestone: JourneyMilestoneViewModel;
}) {
  return (
    <li className="rounded-lg border border-line bg-surface p-6">
      <ContentHint
        enabled={contentDebug}
        path={`src/content/journey-narrative.json > milestones[id=${milestone.id}]`}
      />
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">
          {String(index + 1).padStart(2, "0")} · {milestone.date}
        </span>
      </div>
      <h3 className="mt-3 text-xl font-semibold text-foreground">
        {milestone.title}
      </h3>
      <dl className="mt-5 grid gap-4">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            {labels.state}
          </dt>
          <dd className="mt-2 text-sm leading-6 text-muted md:text-base md:leading-7">
            {milestone.state}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            {labels.reason}
          </dt>
          <dd className="mt-2 text-sm leading-6 text-muted md:text-base md:leading-7">
            {milestone.reason}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            {labels.result}
          </dt>
          <dd className="mt-2 text-sm leading-6 text-muted md:text-base md:leading-7">
            {milestone.result}
          </dd>
        </div>
      </dl>
      {milestone.anchorProjects.length > 0 ? (
        <ul className="mt-5 flex flex-wrap gap-2">
          {milestone.anchorProjects.map((project) => (
            <li key={project.id}>
              <Link
                className="inline-flex items-center gap-2 rounded-md border border-line bg-surface-soft px-3 py-2 text-xs font-semibold text-muted transition hover:border-accent hover:text-foreground"
                href={getTemplateHref(`/projects/${project.id}`, homeTemplate, {
                  contentDebug,
                })}
              >
                {project.title}
                <ArrowRightIcon />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
