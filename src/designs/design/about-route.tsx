import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { ContentHint } from "@/components/portfolio/content-hint";
import { SectionHeading } from "@/components/portfolio/section-heading";
import {
  getTemplateHref,
  type HomeTemplateId,
} from "@/lib/portfolio";
import type {
  AboutViewModel,
  CurationCategoryViewModel,
} from "@/lib/portfolio/view-models";

export function CurationSection({
  content,
  contentDebug,
  homeTemplate,
}: {
  content: AboutViewModel;
  contentDebug: boolean;
  homeTemplate: HomeTemplateId;
}) {
  const pageCopy = content.presentation.pages.about.curation;
  const data = content.curation;

  return (
    <section aria-label={pageCopy.title} className="bg-background-soft">
      <div className="mx-auto grid max-w-6xl gap-9 px-5 py-16 sm:px-8">
        <SectionHeading
          body={pageCopy.body}
          contentDebug={contentDebug}
          contentHint="src/content/curation.json > intro/criteria + src/content/presentation.json > pages.about.curation"
          title={pageCopy.title}
        />
        <p className="max-w-3xl text-sm leading-6 text-muted md:text-base md:leading-7">
          {data.intro}
        </p>
        <div className="grid gap-9 lg:grid-cols-[0.8fr_1.2fr]">
          <h3 className="text-xl font-semibold text-foreground">
            {pageCopy.criteriaTitle}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.criteria.items.map((item) => (
              <article
                className="rounded-lg border border-line bg-surface p-5"
                key={item.title}
              >
                <ContentHint
                  enabled={contentDebug}
                  path={`src/content/curation.json > criteria.items[title=${item.title}]`}
                />
                <h4 className="text-sm font-semibold text-foreground">
                  {item.title}
                </h4>
                <p className="mt-3 text-sm leading-6 text-muted">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="grid gap-9 lg:grid-cols-[0.8fr_1.2fr]">
          <h3 className="text-xl font-semibold text-foreground">
            {pageCopy.categoriesTitle}
          </h3>
          <ul className="grid gap-4">
            {content.curationCategories.map((category) => (
              <CurationCategoryCard
                category={category}
                contentDebug={contentDebug}
                homeTemplate={homeTemplate}
                key={category.id}
              />
            ))}
          </ul>
        </div>
        <div className="grid gap-9 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h3 className="text-xl font-semibold text-foreground">
              {pageCopy.omissionsTitle}
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted">{data.omissions.body}</p>
          </div>
          <ul className="grid gap-3">
            {data.omissions.items.map((item) => (
              <li
                className="rounded-lg border border-line bg-surface p-4"
                key={item.title}
              >
                <h4 className="text-sm font-semibold text-foreground">
                  {item.title}
                </h4>
                <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-9 lg:grid-cols-[0.8fr_1.2fr]">
          <h3 className="text-xl font-semibold text-foreground">
            {pageCopy.nextReviewTitle}
          </h3>
          <div className="rounded-lg border border-line bg-surface p-5">
            <h4 className="text-sm font-semibold text-foreground">
              {data.nextReview.title}
            </h4>
            <p className="mt-3 text-sm leading-6 text-muted">{data.nextReview.body}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CurationCategoryCard({
  category,
  contentDebug,
  homeTemplate,
}: {
  category: CurationCategoryViewModel;
  contentDebug: boolean;
  homeTemplate: HomeTemplateId;
}) {
  const projects = category.projects;

  return (
    <li className="rounded-lg border border-line bg-surface p-5">
      <ContentHint
        enabled={contentDebug}
        path={`src/content/curation.json > categories[id=${category.id}]`}
      />
      <h4 className="text-base font-semibold text-foreground">{category.label}</h4>
      <p className="mt-3 text-sm leading-6 text-muted md:leading-7">
        {category.rationale}
      </p>
      {projects.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                className="inline-flex items-center gap-2 rounded-md border border-line bg-surface-soft px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-accent hover:text-foreground"
                href={getTemplateHref(`/projects/${project.id}`, homeTemplate, {
                  contentDebug,
                })}
              >
                {project.title}
                <ArrowRightIcon />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
