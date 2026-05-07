import type { PortfolioContent } from "@/lib/portfolio";
import { ContentHint } from "./content-hint";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";
import { StackList } from "./stack-list";
import { TechMarquee } from "./tech-marquee";

export function SelectedStackSection({
  content,
  contentDebug,
}: {
  content: PortfolioContent;
  contentDebug: boolean;
}) {
  const stackIds = new Set(content.skills.groups.flatMap((group) => group.items));
  const visibleStackItems = content.techStack.filter((item) => stackIds.has(item.id));
  const copy = content.presentation.home.shared.stack;

  return (
    <section className="border-b border-line bg-background-soft">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8">
        <div className="grid gap-9 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            body={copy.body}
            contentDebug={contentDebug}
            contentHint="src/content/presentation.json > home.shared.stack"
            title={copy.title}
          />
          <div className="grid gap-6">
            <TechMarquee items={visibleStackItems} />
            <div className="grid overflow-hidden rounded-lg border border-line bg-surface sm:grid-cols-2">
              {content.skills.groups.map((group, index) => (
                <Reveal delay={index * 80} key={group.title}>
                  <div className="h-full border-b border-line p-5 sm:border-r">
                    <ContentHint
                      enabled={contentDebug}
                      path={`src/content/skills.json > groups[title=${group.title}]`}
                    />
                    <h3 className="text-sm font-semibold text-foreground">
                      {group.title}
                    </h3>
                    <div className="mt-4">
                      <StackList items={group.items} />
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
