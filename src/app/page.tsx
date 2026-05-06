import { ClassicHomeRoute } from "@/designs/classic/home-route";
import { DesignHomeRoute } from "@/designs/design/home-route";
import {
  getPortfolioContent,
  resolveContentDebug,
  resolveHomeTemplateId,
  type RouteSearchParams,
} from "@/lib/portfolio";

type HomePageProps = {
  searchParams?: RouteSearchParams;
};

export default async function Home({ searchParams }: HomePageProps) {
  const content = getPortfolioContent();
  const params = searchParams ? await searchParams : {};
  const activeTemplate = resolveHomeTemplateId(params.view, content.presentation);
  const contentDebug = resolveContentDebug(params.debug);

  if (activeTemplate === "classic") {
    return <ClassicHomeRoute content={content} contentDebug={contentDebug} />;
  }

  return <DesignHomeRoute content={content} contentDebug={contentDebug} />;
}
