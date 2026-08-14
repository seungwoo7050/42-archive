import type { Metadata } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { StructuredData } from "@/components/portfolio/structured-data";
import {
  resolvePortfolioContentMode,
  resolveProductionSiteUrl,
} from "@/lib/content-readiness";
import { getPortfolioContent } from "@/lib/portfolio";
import {
  createPortfolioMetadata,
  createSiteStructuredData,
} from "@/lib/site-metadata";
import "./globals.css";

const geistSans = localFont({
  display: "swap",
  src: "./fonts/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  display: "swap",
  src: "./fonts/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const koreanSerif = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/SourceHanSerifKR-Variable.woff2",
  variable: "--font-noto-serif-kr",
  weight: "250 900",
});

const { site } = getPortfolioContent();

export async function generateMetadata(): Promise<Metadata> {
  const mode = resolvePortfolioContentMode(
    process.env.PORTFOLIO_CONTENT_MODE,
  );
  let metadataBase: URL;

  if (mode === "production") {
    metadataBase = resolveProductionSiteUrl(process.env.SITE_URL);
  } else {
    const requestHeaders = await headers();
    const host =
      requestHeaders.get("x-forwarded-host") ??
      requestHeaders.get("host") ??
      "localhost:3100";
    const protocol =
      requestHeaders.get("x-forwarded-proto") ??
      (host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https");
    metadataBase = new URL(`${protocol}://${host}`);
  }

  return createPortfolioMetadata({ metadataBase, mode, site });
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const mode = resolvePortfolioContentMode(
    process.env.PORTFOLIO_CONTENT_MODE,
  );
  const siteStructuredData =
    mode === "production"
      ? createSiteStructuredData({
          content: getPortfolioContent(),
          siteUrl: resolveProductionSiteUrl(process.env.SITE_URL),
        })
      : undefined;

  return (
    <html
      lang={site.language}
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${koreanSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {siteStructuredData ? <StructuredData data={siteStructuredData} /> : null}
        {children}
      </body>
    </html>
  );
}
