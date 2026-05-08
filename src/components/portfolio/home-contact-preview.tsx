import { ArrowRightIcon } from "@/components/icons";
import {
  getPreferredContactLinks,
  type HomeTemplateId,
  type PortfolioContent,
} from "@/lib/portfolio";
import { ContentHint } from "./content-hint";
import { ContentLinkView } from "./content-link";

export function HomeContactPreview({
  activeTemplate,
  content,
  contentDebug,
}: {
  activeTemplate: HomeTemplateId;
  content: PortfolioContent;
  contentDebug: boolean;
}) {
  const preferredLinks = getPreferredContactLinks(content);
  const copy = content.presentation.home.shared.contact;

  return (
    <section>
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <ContentHint
            enabled={contentDebug}
            path="src/content/presentation.json > home.shared.contact + src/content/contact.json > availability"
          />
          <h2 className="text-3xl font-semibold text-foreground">{copy.title}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted md:text-base">
            {content.contact.availability}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {preferredLinks.map((link) => (
            <ContentLinkView
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-surface px-4 text-sm font-semibold text-muted transition hover:border-accent hover:text-foreground"
              contentDebug={contentDebug}
              homeTemplate={activeTemplate}
              key={link.id ?? link.href}
              link={link}
            >
              {link.label}
              <ArrowRightIcon className="-rotate-45" />
            </ContentLinkView>
          ))}
        </div>
      </div>
    </section>
  );
}
