import { ContentHint } from "@/components/portfolio/content-hint";
import type { PortfolioProject, ProjectPageContent } from "@/lib/portfolio";

export function DesignProjectsView({
  contentDebug,
  curriculumCount,
  pageCopy,
  projects,
  sourceOnlyCount,
}: {
  contentDebug: boolean;
  curriculumCount: number;
  pageCopy: ProjectPageContent;
  projects: PortfolioProject[];
  sourceOnlyCount: number;
}) {
  const copy = pageCopy.design;

  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <ContentHint
          enabled={contentDebug}
          path="src/content/projects.json > projects[]"
        />
        <p className="text-sm font-medium text-muted">
          {projects.length} {copy.hero.stats.visibleEntries} · {curriculumCount}{" "}
          {copy.hero.stats.archive} · {sourceOnlyCount}{" "}
          {copy.hero.stats.sourceFirst}
        </p>
        <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-tight text-foreground md:text-6xl">
          {copy.hero.title}
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-muted">
          {copy.hero.body}
        </p>
      </div>
    </section>
  );
}
