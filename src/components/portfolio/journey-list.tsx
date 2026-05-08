import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import {
  getTemplateHref,
  type HomeTemplateId,
  type JourneyItem,
} from "@/lib/portfolio";
import { ContentHint } from "./content-hint";
import { Reveal } from "./reveal";

type JourneyListVariant = "compact" | "paired-centerline";

function formatYearMonth(date: string) {
  return date.slice(0, 7).replace("-", ".");
}

function getJourneyPeriod(item: JourneyItem) {
  const start = formatYearMonth(item.date);
  const end = item.endDate ? formatYearMonth(item.endDate) : null;

  if (!end || end === start) {
    return start;
  }

  return `${start} - ${end}`;
}

function JourneyEntry({
  contentDebug,
  homeTemplate,
  item,
}: {
  contentDebug?: boolean;
  homeTemplate?: HomeTemplateId;
  item: JourneyItem;
}) {
  return (
    <>
      <div>
        <ContentHint
          enabled={contentDebug}
          path={`src/content/journey.json > journey[title=${item.title}]`}
        />
        <span className="text-sm font-semibold text-muted">
          {getJourneyPeriod(item)}
        </span>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-accent">
          {item.category}
        </p>
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{item.title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
        {item.projectId ? (
          <Link
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-foreground transition hover:text-accent-strong"
            href={getTemplateHref(`/projects/${item.projectId}`, homeTemplate, {
              contentDebug,
            })}
          >
            Case Study
            <ArrowRightIcon />
          </Link>
        ) : null}
      </div>
    </>
  );
}

function JourneyCard({
  contentDebug,
  homeTemplate,
  item,
}: {
  contentDebug?: boolean;
  homeTemplate?: HomeTemplateId;
  item: JourneyItem;
}) {
  return (
    <article className="paired-timeline-card">
      <JourneyEntry
        contentDebug={contentDebug}
        homeTemplate={homeTemplate}
        item={item}
      />
    </article>
  );
}

function chunkPairs(items: JourneyItem[]) {
  const pairs: JourneyItem[][] = [];

  for (let index = 0; index < items.length; index += 2) {
    pairs.push(items.slice(index, index + 2));
  }

  return pairs;
}

function PairedJourneyList({
  animated,
  contentDebug,
  homeTemplate,
  items,
}: {
  animated: boolean;
  contentDebug?: boolean;
  homeTemplate?: HomeTemplateId;
  items: JourneyItem[];
}) {
  const [startItem, ...projectItems] = items;
  const rows = chunkPairs(projectItems);

  return (
    <div className="paired-timeline">
      <ol className="paired-timeline-list">
        {startItem ? (
          animated ? (
            <Reveal
              as="li"
              className="paired-timeline-start"
              key={`${startItem.date}-${startItem.title}`}
            >
              <JourneyCard
                contentDebug={contentDebug}
                homeTemplate={homeTemplate}
                item={startItem}
              />
            </Reveal>
          ) : (
            <li
              className="paired-timeline-start"
              key={`${startItem.date}-${startItem.title}`}
            >
              <JourneyCard
                contentDebug={contentDebug}
                homeTemplate={homeTemplate}
                item={startItem}
              />
            </li>
          )
        ) : null}
        {rows.map((pair, index) => {
          const rowClassName = `paired-timeline-row ${
            pair.length === 1 ? "is-single" : ""
          }`;
          const row = (
            <>
              <JourneyCard
                contentDebug={contentDebug}
                homeTemplate={homeTemplate}
                item={pair[0]}
              />
              <span aria-hidden="true" className="paired-timeline-node" />
              {pair[1] ? (
                <JourneyCard
                  contentDebug={contentDebug}
                  homeTemplate={homeTemplate}
                  item={pair[1]}
                />
              ) : null}
            </>
          );

          return animated ? (
            <Reveal
              as="li"
              className={rowClassName}
              delay={(index + 1) * 70}
              key={pair.map((item) => `${item.date}-${item.title}`).join("-")}
            >
              {row}
            </Reveal>
          ) : (
            <li
              className={rowClassName}
              key={pair.map((item) => `${item.date}-${item.title}`).join("-")}
            >
              {row}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function JourneyList({
  animated = false,
  contentDebug,
  homeTemplate,
  items,
  variant = "compact",
}: {
  animated?: boolean;
  contentDebug?: boolean;
  homeTemplate?: HomeTemplateId;
  items: JourneyItem[];
  variant?: JourneyListVariant;
}) {
  if (variant === "paired-centerline") {
    return (
      <PairedJourneyList
        animated={animated}
        contentDebug={contentDebug}
        homeTemplate={homeTemplate}
        items={items}
      />
    );
  }

  const rows = items.map((item, index) =>
    animated ? (
      <Reveal
        as="li"
        className="experience-row grid gap-3 border-b border-line py-5 last:border-b-0 sm:grid-cols-[9.5rem_1fr]"
        delay={index * 60}
        key={`${item.date}-${item.title}`}
      >
        <JourneyEntry
          contentDebug={contentDebug}
          homeTemplate={homeTemplate}
          item={item}
        />
      </Reveal>
    ) : (
      <li
        className="experience-row grid gap-3 border-b border-line py-5 last:border-b-0 sm:grid-cols-[9.5rem_1fr]"
        key={`${item.date}-${item.title}`}
      >
        <JourneyEntry
          contentDebug={contentDebug}
          homeTemplate={homeTemplate}
          item={item}
        />
      </li>
    ),
  );

  const list = <ol className="relative border-y border-line">{rows}</ol>;

  if (animated) {
    return <Reveal className="timeline-list">{list}</Reveal>;
  }

  return <div className="timeline-list">{list}</div>;
}
