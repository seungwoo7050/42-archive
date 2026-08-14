import type { Metadata } from "next";

import type { PortfolioSource } from "./content-loader";
import type { PortfolioContentMode } from "./content-readiness";

type SiteContent = PortfolioSource["site"];

export function createPortfolioMetadata({
  metadataBase,
  mode,
  site,
}: {
  metadataBase: URL;
  mode: PortfolioContentMode;
  site: SiteContent;
}): Metadata {
  const socialImage = site.socialImage
    ? new URL(site.socialImage, metadataBase).toString()
    : undefined;
  const shouldIndex = mode === "production";

  return {
    alternates: { canonical: "./" },
    description: site.description,
    metadataBase,
    openGraph: {
      description: site.description,
      images: socialImage ? [{ url: socialImage }] : undefined,
      title: site.title,
      type: "website",
    },
    robots: { follow: shouldIndex, index: shouldIndex },
    title: site.title,
    twitter: {
      card: "summary_large_image",
      description: site.description,
      images: socialImage ? [socialImage] : undefined,
      title: site.title,
    },
  };
}
