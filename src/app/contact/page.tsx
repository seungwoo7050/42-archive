import { ArrowRightIcon } from "@/components/icons";
import { ContentHint } from "@/components/portfolio/content-hint";
import { ContentLinkView } from "@/components/portfolio/content-link";
import { PageShell } from "@/components/portfolio/site-shell";
import {
  getPortfolioContent,
  getPreferredContactLinks,
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
  const pageCopy = content.presentation.pages.contact;
  const preferredLinks = getPreferredContactLinks(content);

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
      <section>
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <ContentHint
              enabled={contentDebug}
              path="src/content/presentation.json > pages.contact.availability + src/content/contact.json > availability/preferred"
            />
            <h2 className="text-2xl font-semibold text-foreground">
              {pageCopy.availability.title}
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted">
              {content.contact.availability}
            </p>
          </div>
          <div className="grid gap-4">
            {preferredLinks.map((link) => (
              <ContentLinkView
                className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface p-5 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent-strong"
                contentDebug={contentDebug}
                homeTemplate={activeTemplate}
                key={link.id ?? link.href}
                link={link}
              >
                {link.label}
                <ArrowRightIcon className="-rotate-45" />
              </ContentLinkView>
            ))}
            <div className="rounded-lg border border-line bg-surface p-5">
              <ContentHint
                enabled={contentDebug}
                path="src/content/presentation.json > pages.contact.notes + src/content/contact.json > notes[]"
              />
              <h2 className="text-sm font-semibold text-foreground">
                {pageCopy.notes.title}
              </h2>
              <ul className="mt-4 grid gap-2">
                {content.contact.notes.map((note) => (
                  <li className="text-sm leading-6 text-muted" key={note}>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
