import { notFound } from "next/navigation";
import { ContentHint } from "@/components/portfolio/content-hint";
import { PageShell } from "@/components/portfolio/site-shell";
import {
  getPortfolioContent,
  isSitePageEnabled,
  resolveContentDebug,
  resolveHomeTemplateId,
  type RouteSearchParams,
} from "@/lib/portfolio";

export default async function JourneyPage({
  searchParams,
}: {
  searchParams?: RouteSearchParams;
}) {
  const content = getPortfolioContent();
  if (!isSitePageEnabled("journey", content)) notFound();
  const params = searchParams ? await searchParams : {};
  const activeTemplate = resolveHomeTemplateId(params.view, content.presentation);
  const contentDebug = resolveContentDebug(params.debug);

  const pageCopy = content.presentation.pages.journey;
  const narrative = content.journeyNarrative;

  return (
    <PageShell
      contentDebug={contentDebug}
      homeTemplate={activeTemplate}
      profile={content.profile}
      site={content.site}
      templateSwitcher={{
        activeId: activeTemplate,
        contentDebug,
        currentPath: "/journey",
        templates: content.presentation.templates,
      }}
    >
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
    </PageShell>
  );
}
