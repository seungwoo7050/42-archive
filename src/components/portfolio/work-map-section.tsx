import { getProjectMetricValue, type PortfolioContent } from "@/lib/portfolio";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export function getWorkMapStats(content: PortfolioContent) {
  return {
    curriculumCount: getProjectMetricValue("curriculumCount", content),
    productCount: getProjectMetricValue("productCount", content),
    reliabilityCount: getProjectMetricValue("reliabilityCount", content),
  };
}

export function WorkMapSection({
  content,
  contentDebug,
}: {
  content: PortfolioContent;
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
