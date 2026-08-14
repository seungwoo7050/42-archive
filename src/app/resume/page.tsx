import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightIcon } from "@/components/icons";
import { ContentHint } from "@/components/portfolio/content-hint";
import { PageShell } from "@/components/portfolio/site-shell";
import { StackList } from "@/components/portfolio/stack-list";
import { hasDedicatedRouteRenderer, renderDesignRoute } from "@/designs/registry";
import {
  getPortfolioContent,
  getResumeProjects,
  getTemplateHref,
  isSitePageEnabled,
  type RouteSearchParams,
} from "@/lib/portfolio";
import { resolvePortfolioPageContext } from "@/lib/portfolio/page-context";
import { createRouteMetadata } from "@/lib/site-metadata";

export function generateMetadata(): Metadata {
  const content = getPortfolioContent();
  if (!isSitePageEnabled("resume", content)) notFound();
  const hero = content.presentation.pages.resume.hero;

  return createRouteMetadata({
    description: hero.body,
    path: "/resume",
    site: content.site,
    title: hero.title,
  });
}

export default async function ResumePage({
  searchParams,
}: {
  searchParams?: RouteSearchParams;
}) {
  const content = getPortfolioContent();
  if (!isSitePageEnabled("resume", content)) notFound();
  const { activeTemplate, contentDebug, shellProps } =
    await resolvePortfolioPageContext({
      content,
      currentPath: "/resume",
      searchParams,
    });

  if (hasDedicatedRouteRenderer(activeTemplate)) {
    return renderDesignRoute(activeTemplate, {
      content,
      contentDebug,
      currentPath: "/resume",
      route: "resume",
    });
  }

  const pageCopy = content.presentation.pages.resume;
  const resumeProjects = getResumeProjects(content);

  return (
    <PageShell {...shellProps}>
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <ContentHint
              enabled={contentDebug}
              path="src/content/presentation.json > pages.resume.hero + src/content/profile.json + src/content/resume.json > downloadUrl"
            />
            <p className="text-sm font-medium text-muted">
              {content.profile.koreanName} · {content.profile.handle}
            </p>
            <h1 className="mt-5 text-5xl font-semibold leading-tight text-foreground md:text-6xl">
              {pageCopy.hero.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted">
              {pageCopy.hero.body}
            </p>
            <dl className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-line bg-surface p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  {pageCopy.identity.locationLabel}
                </dt>
                <dd className="mt-2 text-sm text-foreground">
                  {content.profile.location}
                </dd>
              </div>
              <div className="rounded-lg border border-line bg-surface p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  {pageCopy.identity.availabilityLabel}
                </dt>
                <dd className="mt-2 text-sm leading-6 text-foreground">
                  {content.profile.availability}
                </dd>
              </div>
            </dl>
          </div>
          {content.resume.downloadUrl ? (
            <a
              className="inline-flex h-10 items-center gap-2 rounded-md border border-accent bg-accent px-4 text-sm font-semibold text-background"
              href={content.resume.downloadUrl}
            >
              {pageCopy.hero.downloadLabel}
              <ArrowRightIcon className="-rotate-45" />
            </a>
          ) : null}
        </div>
      </section>
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-9 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <h2 className="text-3xl font-semibold text-foreground">
            {pageCopy.summary.title}
          </h2>
          <div className="grid gap-4">
            {content.resume.summary.map((item) => (
              <p className="text-base leading-7 text-muted" key={item}>
                <ContentHint
                  enabled={contentDebug}
                  path="src/content/resume.json > summary[]"
                />
                {item}
              </p>
            ))}
          </div>
        </div>
      </section>
      <section className="border-b border-line bg-background-soft">
        <div className="mx-auto grid max-w-6xl gap-9 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <h2 className="text-3xl font-semibold text-foreground">
            {pageCopy.projects.title}
          </h2>
          <div className="grid gap-4">
            {resumeProjects.map((project) => (
              <article className="rounded-lg border border-line bg-surface p-5" key={project.id}>
                <ContentHint
                  enabled={contentDebug}
                  path={`src/content/resume.json > projectIds[] + src/content/projects.json > projects[id=${project.id}]`}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold text-foreground">{project.title}</h3>
                  <span className="text-sm text-muted">{project.period}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {project.summary}
                </p>
                <div className="mt-4">
                  <StackList items={project.stack} limit={5} />
                </div>
                <Link
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-foreground transition hover:text-accent-strong"
                  href={getTemplateHref(
                    `/projects/${project.id}`,
                    activeTemplate,
                    { contentDebug },
                  )}
                >
                  {pageCopy.projects.caseStudyLabel}
                  <ArrowRightIcon />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section>
        <div className="mx-auto grid max-w-6xl gap-9 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <h2 className="text-3xl font-semibold text-foreground">
            {pageCopy.training.title}
          </h2>
          <div className="grid gap-4">
            {content.resume.training.map((item) => (
              <article className="rounded-lg border border-line bg-surface p-5" key={item.name}>
                <ContentHint
                  enabled={contentDebug}
                  path={`src/content/resume.json > training[name=${item.name}]`}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold text-foreground">{item.name}</h3>
                  <span className="text-sm text-muted">{item.period}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
      {content.experience.length > 0 ? (
        <section className="border-t border-line bg-background-soft">
          <div className="mx-auto grid max-w-6xl gap-9 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
            <h2 className="text-3xl font-semibold text-foreground">
              {pageCopy.experience.title}
            </h2>
            <div className="grid gap-4">
              {content.experience.map((item) => (
                <article
                  className="rounded-lg border border-line bg-surface p-5"
                  key={`${item.period}-${item.title}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <span className="text-sm text-muted">{item.period}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      {content.resume.education.length > 0 ? (
        <section className="border-t border-line">
          <div className="mx-auto grid max-w-6xl gap-9 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
            <h2 className="text-3xl font-semibold text-foreground">
              {pageCopy.education.title}
            </h2>
            <div className="grid gap-4">
              {content.resume.education.map((item) => (
                <article
                  className="rounded-lg border border-line bg-surface p-5"
                  key={`${item.name}-${item.period}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold text-foreground">{item.name}</h3>
                    <span className="text-sm text-muted">{item.period}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      {content.resume.notes.length > 0 ? (
        <section className="border-t border-line bg-background-soft">
          <div className="mx-auto grid max-w-6xl gap-9 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
            <h2 className="text-3xl font-semibold text-foreground">
              {pageCopy.notes.title}
            </h2>
            <ul className="grid gap-3">
              {content.resume.notes.map((note) => (
                <li
                  className="rounded-lg border border-line bg-surface p-4 text-sm leading-6 text-muted"
                  key={note}
                >
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
