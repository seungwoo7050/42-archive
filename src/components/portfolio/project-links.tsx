import { ArrowUpRightIcon, ExternalLinkIcon } from "@/components/icons";
import {
  getProjectCardLinks,
  isProjectLive,
  type ContentLink,
  type HomeTemplateId,
  type PortfolioProject,
} from "@/lib/portfolio";
import { ContentLinkView } from "./content-link";

function isVisibleProjectLink(project: PortfolioProject, link: ContentLink) {
  if (link.type === "demo") {
    return isProjectLive(project);
  }

  return true;
}

export function ProjectLinks({
  contentDebug,
  excludeCaseStudy = false,
  homeTemplate,
  project,
}: {
  contentDebug?: boolean;
  excludeCaseStudy?: boolean;
  homeTemplate?: HomeTemplateId;
  project: PortfolioProject;
}) {
  const links = project.links.filter((link) => {
    if (excludeCaseStudy && link.type === "case-study") {
      return false;
    }

    return isVisibleProjectLink(project, link);
  });

  if (!links.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => {
        const primary = link.type === "demo";

        return (
          <ContentLinkView
            className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background ${
              primary
                ? "border-accent bg-accent text-background hover:bg-accent-strong"
                : "border-line bg-surface text-muted hover:border-accent hover:text-foreground"
            }`}
            contentDebug={contentDebug}
            key={`${link.type}-${link.href}`}
            homeTemplate={homeTemplate}
            link={link}
          >
            {link.label}
            {link.external ? <ExternalLinkIcon /> : <ArrowUpRightIcon />}
          </ContentLinkView>
        );
      })}
    </div>
  );
}

export function ProjectCardLinks({
  contentDebug,
  homeTemplate,
  project,
}: {
  contentDebug?: boolean;
  homeTemplate?: HomeTemplateId;
  project: PortfolioProject;
}) {
  const links = getProjectCardLinks(project);

  if (!links.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <ContentLinkView
          className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background ${
            link.type === "demo"
              ? "border-accent bg-accent text-background hover:bg-accent-strong"
              : "border-line bg-surface text-muted hover:border-accent hover:text-foreground"
          }`}
          contentDebug={contentDebug}
          homeTemplate={homeTemplate}
          key={`${link.type}-${link.href}`}
          link={link}
        >
          {link.label}
          {link.external ? <ExternalLinkIcon /> : <ArrowUpRightIcon />}
        </ContentLinkView>
      ))}
    </div>
  );
}
