import Link from "next/link";
import type { ProfileContent, SiteContent } from "@/lib/portfolio";

export function SiteHeader({
  profile,
  site,
}: {
  profile: ProfileContent;
  site: SiteContent;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/90 bg-background/88 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link
          className="text-sm font-semibold tracking-normal text-foreground"
          href="/"
        >
          {profile.handle}
        </Link>
        <nav aria-label="Primary navigation" className="hidden items-center gap-6 md:flex">
          {site.navigation.map((item) => (
            <Link
              className="text-sm font-medium text-muted transition hover:text-foreground"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
