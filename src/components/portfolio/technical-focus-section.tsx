import type { PortfolioContent } from "@/lib/portfolio";
import { ContentHint } from "./content-hint";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export function TechnicalFocusSection({
  content,
  contentDebug,
}: {
  content: PortfolioContent;
  contentDebug: boolean;
}) {
  const copy = content.presentation.home.shared.technicalFocus;

  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-6xl gap-9 px-5 py-20 sm:px-8">
        <SectionHeading
          body={copy.body}
          contentDebug={contentDebug}
          contentHint="src/content/presentation.json > home.shared.technicalFocus"
          title={copy.title}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {content.skills.focusAreas.map((area, index) => (
            <Reveal delay={index * 70} key={area.title}>
              <article
                className="motion-card h-full rounded-lg border border-line bg-surface p-5 transition duration-300 hover:border-accent/45 hover:bg-surface-hover"
              >
                <ContentHint
                  enabled={contentDebug}
                  path={`src/content/skills.json > focusAreas[title=${area.title}]`}
                />
                <h3 className="text-base font-semibold text-foreground">
                  {area.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted">{area.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
