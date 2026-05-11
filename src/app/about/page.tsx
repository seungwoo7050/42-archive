import { ContentHint } from "@/components/portfolio/content-hint";
import { JourneyList } from "@/components/portfolio/journey-list";
import { SectionHeading } from "@/components/portfolio/section-heading";
import { PageShell } from "@/components/portfolio/site-shell";
import {
  getPortfolioContent,
  resolveContentDebug,
  resolveHomeTemplateId,
  type RouteSearchParams,
} from "@/lib/portfolio";

export default async function AboutPage({
  searchParams,
}: {
  searchParams?: RouteSearchParams;
}) {
  const content = getPortfolioContent();
  const params = searchParams ? await searchParams : {};
  const activeTemplate = resolveHomeTemplateId(params.view, content.presentation);
  const contentDebug = resolveContentDebug(params.debug);
  const pageCopy = content.presentation.pages.about;

  return (
    <PageShell
      contentDebug={contentDebug}
      homeTemplate={activeTemplate}
      profile={content.profile}
      site={content.site}
      templateSwitcher={{
        activeId: activeTemplate,
        contentDebug,
        currentPath: "/about",
        templates: content.presentation.templates,
      }}
    >
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <ContentHint
            enabled={contentDebug}
            path="src/content/profile.json > name/handle/summary"
          />
          <p className="text-sm font-medium text-muted">
            {content.profile.name} · {content.profile.handle}
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-tight text-foreground md:text-6xl">
            {pageCopy.hero.title}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted">
            {content.profile.summary}
          </p>
        </div>
      </section>
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-9 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            contentDebug={contentDebug}
            contentHint="src/content/presentation.json > pages.about.principles"
            title={pageCopy.principles.title}
          />
          <div className="grid gap-4">
            {content.profile.principles.map((principle) => (
              <article
                className="rounded-lg border border-line bg-surface p-5"
                key={principle.title}
              >
                <ContentHint
                  enabled={contentDebug}
                  path={`src/content/profile.json > principles[title=${principle.title}]`}
                />
                <h2 className="font-semibold text-foreground">
                  {principle.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {principle.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="border-b border-line bg-background-soft">
        <div className="mx-auto grid max-w-6xl gap-9 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            contentDebug={contentDebug}
            contentHint="src/content/presentation.json > pages.about.journey + src/content/journey.json > journey[]"
            title={pageCopy.journey.title}
          />
          <JourneyList
            contentDebug={contentDebug}
            homeTemplate={activeTemplate}
            items={content.journey}
          />
        </div>
      </section>
    </PageShell>
  );
}
