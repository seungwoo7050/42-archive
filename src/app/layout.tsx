import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Content-driven portfolio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
