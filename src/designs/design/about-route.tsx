import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { ContentHint } from "@/components/portfolio/content-hint";
import {
  getTemplateHref,
  type HomeTemplateId,
} from "@/lib/portfolio";
import type { CurationCategoryViewModel } from "@/lib/portfolio/view-models";

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
