import type { Metadata } from "next";
import { ClassicHomeRoute } from "@/designs/classic/home-route";
import { DesignHomeRoute } from "@/designs/design/home-route";
import { hasDedicatedRouteRenderer, renderDesignRoute } from "@/designs/registry";
import { getPortfolioContent, type RouteSearchParams } from "@/lib/portfolio";
import { resolvePortfolioPageContext } from "@/lib/portfolio/page-context";
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

  if (hasDedicatedRouteRenderer(activeTemplate)) {
    return renderDesignRoute(activeTemplate, {
      content,
      contentDebug,
      currentPath: "/",
      route: "home",
    });
  }

  if (activeTemplate === "classic") {
    return <ClassicHomeRoute content={content} contentDebug={contentDebug} />;
  }

  return <DesignHomeRoute content={content} contentDebug={contentDebug} />;
}
