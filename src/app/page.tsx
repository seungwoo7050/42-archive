import { ClassicHomeRoute } from "@/designs/classic/home-route";
import { DesignHomeRoute } from "@/designs/design/home-route";
import { hasDedicatedRouteRenderer, renderDesignRoute } from "@/designs/registry";
import { type RouteSearchParams } from "@/lib/portfolio";
import { resolvePortfolioPageContext } from "@/lib/portfolio/page-context";

type HomePageProps = {
  searchParams?: RouteSearchParams;
};

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
