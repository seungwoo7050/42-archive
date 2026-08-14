import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { DesignSwitcher } from "@/components/portfolio/design-switcher";
import {
  getTemplateHref,
  type HomeTemplateId,
  type PresentationContent,
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

function isCurrentNavigation(href: string, currentPath: string | undefined) {
  if (!currentPath) return false;
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function SiteHeader({
  templateSwitcher,
  profile,
  site,
  ui,
}: {
  templateSwitcher?: TemplateSwitcherProps;
  profile: ProfileContent;
  site: SiteContent;
  ui: PresentationContent["ui"];
}) {
  return (
    <header
      className="sticky top-0 z-30 border-b border-line/90 bg-background/88 backdrop-blur"
      data-site-header
    >
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-2 sm:px-8">
        <Link
          className="text-sm font-semibold tracking-normal text-foreground"
          href={getTemplateHref("/", templateSwitcher?.activeId, {
            contentDebug: templateSwitcher?.contentDebug,
          })}
        >
          {profile.handle}
        </Link>
        <nav
          aria-label={ui.primaryNavigationAriaLabel}
          className="hidden items-center gap-6 md:flex"
        >
          {site.navigation.map((item) => (
            <Link
              aria-current={
                isCurrentNavigation(item.href, templateSwitcher?.currentPath)
                  ? "page"
                  : undefined
              }
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
        <details className="relative md:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center rounded border border-line px-3 text-xs font-semibold uppercase tracking-wide text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            {ui.menuLabel}
          </summary>
          <nav
            aria-label={ui.mobileNavigationAriaLabel}
            className="absolute right-0 top-[calc(100%+0.5rem)] grid min-w-52 gap-1 border border-line bg-surface p-2 shadow-xl"
          >
            {site.navigation.map((item) => (
              <Link
                aria-current={
                  isCurrentNavigation(item.href, templateSwitcher?.currentPath)
                    ? "page"
                    : undefined
                }
                className="flex min-h-11 items-center px-3 text-sm font-medium text-muted hover:bg-surface-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                href={getTemplateHref(item.href, templateSwitcher?.activeId, {
                  contentDebug: templateSwitcher?.contentDebug,
                })}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </details>
        {templateSwitcher ? (
          <DesignSwitcher
            activeId={templateSwitcher.activeId}
            contentDebug={templateSwitcher.contentDebug}
            currentPath={templateSwitcher.currentPath}
            templates={templateSwitcher.templates}
            ui={ui}
          />
        ) : null}
      </div>
    </header>
  );
}

export function SiteFooter({
  contentDebug,
  homeTemplate,
  site,
}: {
  contentDebug?: boolean;
  homeTemplate?: HomeTemplateId;
  site: SiteContent;
}) {
  return (
    <footer className="border-t border-line bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>{site.footer.note}</p>
        <Link
          className="inline-flex items-center gap-2 font-semibold text-foreground transition hover:text-accent-strong"
          href={getTemplateHref("/", homeTemplate, { contentDebug })}
        >
          {site.footer.copyright}
          <ArrowRightIcon className="-rotate-45" />
        </Link>
      </div>
    </footer>
  );
}

export function PageShell({
  children,
  contentDebug,
  homeTemplate,
  profile,
  routeRenderer,
  site,
  templateSwitcher,
  ui,
}: {
  children: React.ReactNode;
  contentDebug?: boolean;
  homeTemplate?: HomeTemplateId;
  profile: ProfileContent;
  routeRenderer?: "classic" | "design";
  site: SiteContent;
  templateSwitcher?: TemplateSwitcherProps;
  ui: PresentationContent["ui"];
}) {
  return (
    <div
      className="min-h-screen bg-background text-foreground"
      data-route-renderer={routeRenderer}
      data-site-design={homeTemplate}
    >
      <a
        className="fixed left-4 top-[-5rem] z-[100] bg-foreground px-4 py-3 text-sm font-semibold text-background focus:top-4"
        href="#main-content"
      >
        {ui.skipLinkLabel}
      </a>
      <SiteHeader
        profile={profile}
        site={site}
        templateSwitcher={templateSwitcher}
        ui={ui}
      />
      <main data-home-template={homeTemplate} id="main-content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter
        contentDebug={contentDebug}
        homeTemplate={homeTemplate}
        site={site}
      />
    </div>
  );
}
