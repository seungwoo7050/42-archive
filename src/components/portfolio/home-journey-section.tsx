import type { HomeTemplateId, PortfolioContent } from "@/lib/portfolio";
import { JourneyList } from "./journey-list";
import { SectionHeading } from "./section-heading";

export function HomeJourneySection({
  activeTemplate,
  content,
  contentDebug,
}: {
  activeTemplate: HomeTemplateId;
  content: PortfolioContent;
  contentDebug: boolean;
}) {
  const copy = content.presentation.home.shared.journey;

  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-6xl gap-9 px-5 py-20 sm:px-8">
        <SectionHeading
          body={copy.body}
          contentDebug={contentDebug}
          contentHint="src/content/presentation.json > home.shared.journey"
          title={copy.title}
        />
        <JourneyList
          animated
          caseStudyLabel={content.presentation.ui.journeyCaseStudyLabel}
          contentDebug={contentDebug}
          homeTemplate={activeTemplate}
          items={content.journey}
          variant="paired-centerline"
        />
      </div>
    </section>
  );
}
