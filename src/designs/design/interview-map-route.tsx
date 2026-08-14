import { ContentHint } from "@/components/portfolio/content-hint";
import type { HomeTemplateId } from "@/lib/portfolio";
import type {
  InterviewMapTrackViewModel,
  InterviewMapViewModel,
} from "@/lib/portfolio/view-models";

export function TrackSection({
  contentDebug,
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
            <tbody />
          </table>
        </div>
      </div>
    </section>
  );
}
