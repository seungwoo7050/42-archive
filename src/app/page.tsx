import type { Metadata } from "next";
import { renderDesignRoute } from "@/designs/registry";
import { resolvePortfolioPageContext } from "@/lib/portfolio/page-context";
import { createHomeViewModel } from "@/lib/portfolio/view-models";
import {
  getPortfolioContent,
  type RouteSearchParams,
} from "@/lib/portfolio";
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

  return renderDesignRoute(activeTemplate, {
    contentDebug,
    currentPath: "/",
    route: "home",
    viewModel: createHomeViewModel(content),
  });
}
