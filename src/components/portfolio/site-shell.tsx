import Link from "next/link";
import {
  getTemplateHref,
  type HomeTemplateId,
  type PresentationTemplate,
  type ProfileContent,
  type SiteContent,
} from "@/lib/portfolio";

type TemplateSwitcherProps = {
  activeId: HomeTemplateId;
  contentDebug?: boolean;
  currentPath: string;
  templates: PresentationTemplate[];
};

export function SiteHeader({
  templateSwitcher,
  profile,
  site,
}: {
  templateSwitcher?: TemplateSwitcherProps;
  profile: ProfileContent;
  site: SiteContent;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/90 bg-background/88 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link
          className="text-sm font-semibold tracking-normal text-foreground"
          href={getTemplateHref("/", templateSwitcher?.activeId, {
            contentDebug: templateSwitcher?.contentDebug,
          })}
        >
          {profile.handle}
        </Link>
        <nav aria-label="Primary navigation" className="hidden items-center gap-6 md:flex">
          {site.navigation.map((item) => (
            <Link
              className="text-sm font-medium text-muted transition hover:text-foreground"
              href={getTemplateHref(item.href, templateSwitcher?.activeId, {
                contentDebug: templateSwitcher?.contentDebug,
              })}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {templateSwitcher ? (
          <nav
            aria-label="Home template"
            className="flex rounded-md border border-line bg-surface p-1"
          >
            {templateSwitcher.templates.map((template) => {
              const isActive = template.id === templateSwitcher.activeId;

              return (
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-accent text-background"
                      : "text-muted hover:bg-surface-soft hover:text-foreground"
                  }`}
                  href={getTemplateHref(
                    templateSwitcher.currentPath,
                    template.id,
                    {
                      alwaysInclude: true,
                      contentDebug: templateSwitcher.contentDebug,
                    },
                  )}
                  key={template.id}
                  title={template.description}
                >
                  {template.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
