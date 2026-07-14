import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightIcon } from "@/components/icons";
import { ContentHint } from "@/components/portfolio/content-hint";
import { SectionHeading } from "@/components/portfolio/section-heading";
import { PageShell } from "@/components/portfolio/site-shell";
import { hasDedicatedRouteRenderer, renderDesignRoute } from "@/designs/registry";
import {
  getPortfolioContent,
  getTemplateHref,
  isSitePageEnabled,
  type HomeTemplateId,
  type InterviewMapTrack,
  type PortfolioContent,
  type RouteSearchParams,
} from "@/lib/portfolio";
import { resolvePortfolioPageContext } from "@/lib/portfolio/page-context";

export default async function InterviewMapPage({
  searchParams,
}: {
  searchParams?: RouteSearchParams;
}) {
  const content = getPortfolioContent();
  if (!isSitePageEnabled("interviewMap", content)) notFound();
  const { activeTemplate, contentDebug, shellProps } =
    await resolvePortfolioPageContext({
      content,
      currentPath: "/interview-map",
      searchParams,
    });

  if (hasDedicatedRouteRenderer(activeTemplate)) {
    return renderDesignRoute(activeTemplate, {
      content,
      contentDebug,
      currentPath: "/interview-map",
      route: "interview-map",
    });
  }

  const pageCopy = content.presentation.pages.interviewMap;
  const data = content.interviewMap;

  return (
    <PageShell {...shellProps}>
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <ContentHint
            enabled={contentDebug}
            path="src/content/presentation.json > pages.interviewMap + src/content/interview-map.json > intro/referenceRepo"
          />
          <p className="text-sm font-medium text-muted">{pageCopy.hero.eyebrow}</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-tight text-foreground md:text-6xl">
            {pageCopy.hero.title}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted">
            {data.intro}
          </p>
          <a
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-md border border-line bg-surface px-4 text-sm font-semibold text-muted transition hover:border-accent hover:text-foreground"
            href={data.referenceRepo.href}
            rel="noreferrer"
            target="_blank"
          >
            {data.referenceRepo.label}
            <ArrowRightIcon className="-rotate-45" />
          </a>
        </div>
      </section>
      <section className="border-b border-line bg-background-soft">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <ContentHint
            enabled={contentDebug}
            path="src/content/interview-map.json > tracks[]"
          />
          <nav aria-label={pageCopy.tracks.indexLabel}>
            <ul className="flex flex-wrap gap-2">
              {data.tracks.map((track) => (
                <li key={track.id}>
                  <a
                    className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-xs font-semibold text-muted transition hover:border-accent hover:text-foreground"
                    href={`#track-${track.id}`}
                  >
                    {track.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>
      <div>
        {data.tracks.map((track, index) => (
          <TrackSection
            content={content}
            contentDebug={contentDebug}
            homeTemplate={activeTemplate}
            index={index}
            key={track.id}
            pageCopy={pageCopy}
            track={track}
          />
        ))}
      </div>
      <section aria-label={pageCopy.gaps.ariaLabel}>
        <div className="mx-auto grid max-w-6xl gap-9 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            body={data.gaps.body}
            contentDebug={contentDebug}
            contentHint="src/content/interview-map.json > gaps"
            title={data.gaps.title}
          />
          <ul className="grid gap-3">
            {data.gaps.items.map((item) => (
              <li
                className="rounded-lg border border-line bg-surface p-4 text-sm leading-6 text-muted"
                key={item}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PageShell>
  );
}

function TrackSection({
  content,
  contentDebug,
  homeTemplate,
  index,
  pageCopy,
  track,
}: {
  content: PortfolioContent;
  contentDebug: boolean;
  homeTemplate: HomeTemplateId;
  index: number;
  pageCopy: PortfolioContent["presentation"]["pages"]["interviewMap"];
  track: InterviewMapTrack;
}) {
  const projectsById = new Map(
    content.projects.map((project) => [project.id, project]),
  );

  return (
    <section
      className={`border-b border-line ${index % 2 === 0 ? "" : "bg-background-soft"}`}
      id={`track-${track.id}`}
    >
      <div className="mx-auto grid max-w-6xl gap-9 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <ContentHint
            enabled={contentDebug}
            path={`src/content/interview-map.json > tracks[id=${track.id}]`}
          />
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">
            {pageCopy.tracks.itemCountTemplate.replace(
              "{count}",
              String(track.items.length),
            )}
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-foreground">
            {track.label}
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted md:text-base">
            {track.body}
          </p>
        </div>
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-soft text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                <th className="px-4 py-3" scope="col">
                  {pageCopy.tracks.questionLabel}
                </th>
                <th className="px-4 py-3" scope="col">
                  {pageCopy.tracks.answerLabel}
                </th>
                <th className="px-4 py-3" scope="col">
                  {pageCopy.tracks.depthLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              {track.items.map((item) => (
                <tr
                  className="border-b border-line align-top last:border-b-0"
                  key={item.label}
                >
                  <td className="px-4 py-4">
                    <p className="font-semibold text-foreground">{item.label}</p>
                    <a
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-muted transition hover:text-foreground"
                      href={item.reference}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {pageCopy.tracks.referenceLabel}
                      <ArrowRightIcon className="-rotate-45" />
                    </a>
                  </td>
                  <td className="px-4 py-4">
                    <ul className="grid gap-2">
                      {item.answers.map((answer) => {
                        const project = projectsById.get(answer.projectId);

                        if (!project) {
                          return (
                            <li
                              className="text-xs leading-5 text-muted"
                              key={answer.projectId}
                            >
                              {answer.projectId}
                            </li>
                          );
                        }

                        return (
                          <li key={answer.projectId}>
                            <Link
                              className="inline-flex items-center gap-2 text-sm font-semibold text-foreground transition hover:text-accent-strong"
                              href={getTemplateHref(
                                `/projects/${project.id}`,
                                homeTemplate,
                                { contentDebug },
                              )}
                            >
                              {project.title}
                              <ArrowRightIcon />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </td>
                  <td className="px-4 py-4 text-sm leading-6 text-muted">
                    <ul className="grid gap-2">
                      {item.answers.map((answer) => (
                        <li key={`${answer.projectId}-depth`}>{answer.depth}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
