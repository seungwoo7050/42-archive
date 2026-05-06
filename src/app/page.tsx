import { DesignHomeRoute } from "@/designs/design/home-route";
import { getPortfolioContent } from "@/lib/portfolio";

export default function Home() {
  const content = getPortfolioContent();

  return <DesignHomeRoute content={content} contentDebug={false} />;
}
