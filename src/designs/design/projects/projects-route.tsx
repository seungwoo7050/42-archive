import { ContentHint } from "@/components/portfolio/content-hint";
import { ProjectCard } from "@/components/portfolio/project-card";
import type {
  HomeTemplateId,
  PortfolioProject,
  ProjectPageContent,
} from "@/lib/portfolio";

export function DesignProjectsView({
  activeTemplate,
  contentDebug,
  curriculumCount,
  featuredProjects,
  pageCopy,
  projects,
  sourceOnlyCount,
}: {
  activeTemplate: HomeTemplateId;
  contentDebug: boolean;
  curriculumCount: number;
  featuredProjects: PortfolioProject[];
  pageCopy: ProjectPageContent;
  projects: PortfolioProject[];
  sourceOnlyCount: number;
}) {
  const copy = pageCopy.design;

  return (
    <>
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
      <section className="border-b border-line bg-background-soft">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-14 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <ContentHint
                enabled={contentDebug}
                path="src/content/presentation.json > pages.projects.design.featured"
              />
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                {copy.featured.eyebrow}
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-foreground">
                {copy.featured.title}
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted">
              {copy.featured.body}
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {featuredProjects.map((project, index) => (
              <ProjectCard
                contentDebug={contentDebug}
                homeTemplate={activeTemplate}
                key={project.id}
                priority={index < 2}
                project={project}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
