import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { ContentHint } from "@/components/portfolio/content-hint";
import { JourneyList } from "@/components/portfolio/journey-list";
import { SectionHeading } from "@/components/portfolio/section-heading";
import { PageShell } from "@/components/portfolio/site-shell";
import {
  getTemplateHref,
  type HomeTemplateId,
  type PresentationContent,
} from "@/lib/portfolio";
import {
  type JourneyMilestoneViewModel,
} from "@/lib/portfolio/view-models";
import type { PreparedDesignRouteProps as DesignRouteProps } from "@/designs/shell-props";
import { createDesignShellProps } from "@/designs/shell-props";

export default function JourneyRoute({
  content,
  contentDebug,
  currentPath,
}: DesignRouteProps) {
  if (content.route !== "journey") return null;

  const activeTemplate = "design";
  const shellProps = createDesignShellProps(
    content,
    contentDebug,
    currentPath,
    activeTemplate,
  );
  const pageCopy = content.presentation.pages.journey;
  const narrative = content.journeyNarrative;

  return (
    <PageShell {...shellProps}>
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <ContentHint
            enabled={contentDebug}
            path="src/content/presentation.json > pages.journey.hero + src/content/journey-narrative.json > intro"
          />
          <p className="text-sm font-medium text-muted">{pageCopy.hero.eyebrow}</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-tight text-foreground md:text-6xl">
            {pageCopy.hero.title}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted">
            {narrative.intro}
          </p>
        </div>
      </section>
      <section className="border-b border-line bg-background-soft">
        <div className="mx-auto grid max-w-6xl gap-9 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            body={pageCopy.narrative.body}
            contentDebug={contentDebug}
            contentHint="src/content/journey-narrative.json > milestones[]"
            title={pageCopy.narrative.title}
          />
          <ol className="grid gap-5">
            {content.milestones.map((milestone, index) => (
              <MilestoneCard
                contentDebug={contentDebug}
                homeTemplate={activeTemplate}
                index={index}
                key={milestone.id}
                labels={pageCopy.narrative.labels}
                milestone={milestone}
              />
            ))}
          </ol>
        </div>
      </section>
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-9 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            body={pageCopy.timeline.body}
            contentDebug={contentDebug}
            contentHint="src/content/journey.json > journey[]"
            title={pageCopy.timeline.title}
          />
          <JourneyList
            caseStudyLabel={content.presentation.ui.journeyCaseStudyLabel}
            contentDebug={contentDebug}
            homeTemplate={activeTemplate}
            items={content.journey}
            variant="paired-centerline"
          />
        </div>
      </section>
      <section>
        <div className="mx-auto grid max-w-6xl gap-9 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            contentDebug={contentDebug}
            contentHint="src/content/journey-narrative.json > currentPosition"
            title={pageCopy.now.title}
          />
          <div className="rounded-lg border border-line bg-surface p-6">
            <h3 className="text-base font-semibold text-foreground">
              {narrative.currentPosition.title}
            </h3>
            <p className="mt-4 text-sm leading-6 text-muted md:text-base md:leading-7">
              {narrative.currentPosition.body}
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function MilestoneCard({
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
