import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { ContentHint } from "@/components/portfolio/content-hint";
import {
  getTemplateHref,
  type HomeTemplateId,
} from "@/lib/portfolio";
import type {
  InterviewMapTrackViewModel,
  InterviewMapViewModel,
} from "@/lib/portfolio/view-models";

export function TrackSection({
  contentDebug,
  homeTemplate,
  index,
  pageCopy,
  track,
}: {
  contentDebug: boolean;
  homeTemplate: HomeTemplateId;
  index: number;
  pageCopy: InterviewMapViewModel["presentation"]["pages"]["interviewMap"];
  track: InterviewMapTrackViewModel;
}) {
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
                        const project = answer.project;

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
