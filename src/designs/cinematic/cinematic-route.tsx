import Link from "next/link";
import {
  getTemplateHref,
  type ContentLink,
} from "@/lib/portfolio";
import styles from "./cinematic.module.css";

export function routeHref(href: string, contentDebug = false) {
  return getTemplateHref(href, "cinematic", { contentDebug });
}

export function isCurrentNavigation(href: string, currentPath: string) {
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function CinematicLink({
  children,
  className,
  contentDebug,
  external,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  contentDebug: boolean;
  external?: boolean;
  href: string;
}) {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link className={className} href={routeHref(href, contentDebug)}>
        {children}
      </Link>
    );
  }

  const opensNewTab = external || href.startsWith("http://") || href.startsWith("https://");

  return (
    <a
      className={className}
      href={href}
      rel={opensNewTab ? "noreferrer" : undefined}
      target={opensNewTab ? "_blank" : undefined}
    >
      {children}
    </a>
  );
}

export function LinkList({
  contentDebug,
  links,
}: {
  contentDebug: boolean;
  links: ContentLink[];
}) {
  return (
    <div className={styles.linkList}>
      {links.filter((link) => link.enabled !== false).map((link) => {
        const children = (
          <>
            {link.label}
            <span aria-hidden="true">↗</span>
          </>
        );

        return (
          <CinematicLink
            contentDebug={contentDebug}
            external={link.external}
            href={link.href}
            key={link.id ?? `${link.label}-${link.href}`}
          >
            {children}
          </CinematicLink>
        );
      })}
    </div>
  );
}

export function ChapterLabel({ children, index }: { children: React.ReactNode; index: number }) {
  return (
    <p className={styles.chapterLabel}>
      <span>{String(index).padStart(2, "0")}</span>
      {children}
    </p>
  );
}
