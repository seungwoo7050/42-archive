import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Serif_KR } from "next/font/google";
import { headers } from "next/headers";
import { getPortfolioContent } from "@/lib/portfolio";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSerif = Noto_Serif_KR({
  display: "swap",
  preload: false,
  variable: "--font-noto-serif-kr",
  weight: ["500", "700"],
});

const { site } = getPortfolioContent();

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3100";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  const socialImage = site.socialImage
    ? new URL(site.socialImage, metadataBase).toString()
    : undefined;

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
    title: site.title,
    twitter: {
      card: "summary_large_image",
      description: site.description,
      images: socialImage ? [socialImage] : undefined,
      title: site.title,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={site.language}
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
