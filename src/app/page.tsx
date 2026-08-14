import type { Metadata } from "next";
import { ClassicHomeRoute } from "@/designs/classic/home-route";
import { DesignHomeRoute } from "@/designs/design/home-route";
import { hasDedicatedRouteRenderer, renderDesignRoute } from "@/designs/registry";
import { getPortfolioContent, type RouteSearchParams } from "@/lib/portfolio";
import { resolvePortfolioPageContext } from "@/lib/portfolio/page-context";
import { createHomeViewModel } from "@/lib/portfolio/view-models";
import { createRouteMetadata } from "@/lib/site-metadata";

type HomePageProps = {
  searchParams?: RouteSearchParams;
};

export function generateMetadata(): Metadata {
  const content = getPortfolioContent();

  return createRouteMetadata({
    description: content.site.description,
    path: "/",
    site: content.site,
    title: content.site.title,
  });
}

export default async function Home({ searchParams }: HomePageProps) {
  const { activeTemplate, content, contentDebug } =
    await resolvePortfolioPageContext({
      currentPath: "/",
      searchParams,
    });
  const viewModel = createHomeViewModel(content);

  if (hasDedicatedRouteRenderer(activeTemplate)) {
    return renderDesignRoute(activeTemplate, {
      contentDebug,
      currentPath: "/",
      route: "home",
      viewModel,
    });
  }

  if (activeTemplate === "classic") {
    return <ClassicHomeRoute content={viewModel} contentDebug={contentDebug} />;
  }

  return <DesignHomeRoute content={viewModel} contentDebug={contentDebug} />;
}
