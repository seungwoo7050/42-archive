import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ClassicContactRoute from "@/designs/classic/contact-route";
import DesignContactRoute from "@/designs/design/contact-route";
import { hasDedicatedRouteRenderer, renderDesignRoute } from "@/designs/registry";
import {
  getPortfolioContent,
  isSitePageEnabled,
  type RouteSearchParams,
} from "@/lib/portfolio";
import { resolvePortfolioPageContext } from "@/lib/portfolio/page-context";
import { createContactViewModel } from "@/lib/portfolio/view-models";
import { createRouteMetadata } from "@/lib/site-metadata";

export function generateMetadata(): Metadata {
  const content = getPortfolioContent();
  if (!isSitePageEnabled("contact", content)) notFound();

  return createRouteMetadata({
    description: content.contact.intro,
    path: "/contact",
    site: content.site,
    title: content.contact.title,
  });
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams?: RouteSearchParams;
}) {
  const contentSource = getPortfolioContent();
  if (!isSitePageEnabled("contact", contentSource)) notFound();
  const { activeTemplate, contentDebug } =
    await resolvePortfolioPageContext({
      content: contentSource,
      currentPath: "/contact",
      searchParams,
    });
  const content = createContactViewModel(contentSource);

  if (hasDedicatedRouteRenderer(activeTemplate)) {
    return renderDesignRoute(activeTemplate, {
      contentDebug,
      currentPath: "/contact",
      route: "contact",
      viewModel: content,
    });
  }

  const ContactRoute = activeTemplate === "design" ? DesignContactRoute : ClassicContactRoute;

  return (
    <ContactRoute
      content={content}
      contentDebug={contentDebug}
      currentPath="/contact"
      route="contact"
    />
  );
}
