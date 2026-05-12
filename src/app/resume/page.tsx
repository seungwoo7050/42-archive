import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { ContentHint } from "@/components/portfolio/content-hint";
import { PageShell } from "@/components/portfolio/site-shell";
import { StackList } from "@/components/portfolio/stack-list";
import {
  getPortfolioContent,
  getResumeProjects,
  getTemplateHref,
  resolveContentDebug,
  resolveHomeTemplateId,
  type RouteSearchParams,
} from "@/lib/portfolio";

export default async function ResumePage({
  searchParams,
}: {
  searchParams?: RouteSearchParams;
}) {
  const content = getPortfolioContent();
  const params = searchParams ? await searchParams : {};
  const activeTemplate = resolveHomeTemplateId(params.view, content.presentation);
  const contentDebug = resolveContentDebug(params.debug);
  const pageCopy = content.presentation.pages.resume;
  const resumeProjects = getResumeProjects(content);

  return (
    <PageShell
      contentDebug={contentDebug}
      homeTemplate={activeTemplate}
      profile={content.profile}
      site={content.site}
      templateSwitcher={{
        activeId: activeTemplate,
        contentDebug,
        currentPath: "/resume",
        templates: content.presentation.templates,
      }}
    >
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
              <article
                className="rounded-lg border border-line bg-surface p-5"
                key={project.id}
              >
                <ContentHint
                  enabled={contentDebug}
                  path={`src/content/resume.json > projectIds[] + src/content/projects.json > projects[id=${project.id}]`}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold text-foreground">
                    {project.title}
                  </h3>
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
              <article
                className="rounded-lg border border-line bg-surface p-5"
                key={item.name}
              >
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
    </PageShell>
  );
}
