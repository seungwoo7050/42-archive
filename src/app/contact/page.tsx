import { ContentHint } from "@/components/portfolio/content-hint";
import { PageShell } from "@/components/portfolio/site-shell";
import {
  getPortfolioContent,
  resolveContentDebug,
  resolveHomeTemplateId,
  type RouteSearchParams,
} from "@/lib/portfolio";

export default async function ContactPage({
  searchParams,
}: {
  searchParams?: RouteSearchParams;
}) {
  const content = getPortfolioContent();
  const params = searchParams ? await searchParams : {};
  const activeTemplate = resolveHomeTemplateId(params.view, content.presentation);
  const contentDebug = resolveContentDebug(params.debug);

  return (
    <PageShell
      contentDebug={contentDebug}
      homeTemplate={activeTemplate}
      profile={content.profile}
      site={content.site}
      templateSwitcher={{
        activeId: activeTemplate,
        contentDebug,
        currentPath: "/contact",
        templates: content.presentation.templates,
      }}
    >
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <ContentHint
            enabled={contentDebug}
            path="src/content/contact.json > title/intro"
          />
          <p className="text-sm font-medium text-muted">
            {content.profile.name} · {content.profile.handle}
          </p>
          <h1 className="mt-5 text-5xl font-semibold leading-tight text-foreground md:text-6xl">
            {content.contact.title}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted">
            {content.contact.intro}
          </p>
        </div>
      </section>
    </PageShell>
  );
}
