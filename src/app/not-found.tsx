import type { Metadata } from "next";
import Link from "next/link";

import { ArrowRightIcon } from "@/components/icons";
import { PageShell } from "@/components/portfolio/site-shell";
import { getPortfolioContent } from "@/lib/portfolio";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Page not found",
};

export default function NotFound() {
  const content = getPortfolioContent();

  return (
    <PageShell
      homeTemplate={content.presentation.defaultHomeTemplate}
      profile={content.profile}
      site={content.site}
      ui={content.presentation.ui}
    >
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 md:py-32">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-accent">
            404
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-tight text-foreground md:text-6xl">
            Page not found
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted">
            The address may be incorrect, or the page may no longer be part of
            this portfolio.
          </p>
          <Link
            className="mt-8 inline-flex h-11 items-center gap-2 rounded-md border border-accent bg-accent px-4 text-sm font-semibold text-background"
            href="/"
          >
            Return home
            <ArrowRightIcon />
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
