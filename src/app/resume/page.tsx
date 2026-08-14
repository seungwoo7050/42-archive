import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ClassicResumeRoute from "@/designs/classic/resume-route";
import DesignResumeRoute from "@/designs/design/resume-route";
import { hasDedicatedRouteRenderer, renderDesignRoute } from "@/designs/registry";
import {
  getPortfolioContent,
  isSitePageEnabled,
  type RouteSearchParams,
} from "@/lib/portfolio";
import { resolvePortfolioPageContext } from "@/lib/portfolio/page-context";
import { createResumeViewModel } from "@/lib/portfolio/view-models";
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
  const contentSource = getPortfolioContent();
  if (!isSitePageEnabled("resume", contentSource)) notFound();
  const { activeTemplate, contentDebug } =
    await resolvePortfolioPageContext({
      content: contentSource,
      currentPath: "/resume",
      searchParams,
    });
  const content = createResumeViewModel(contentSource);

  if (hasDedicatedRouteRenderer(activeTemplate)) {
    return renderDesignRoute(activeTemplate, {
      contentDebug,
      currentPath: "/resume",
      route: "resume",
      viewModel: content,
    });
  }

  const ResumeRoute = activeTemplate === "design" ? DesignResumeRoute : ClassicResumeRoute;

  return (
    <ResumeRoute
      content={content}
      contentDebug={contentDebug}
      currentPath="/resume"
      route="resume"
    />
  );
}
