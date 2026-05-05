import Link from "next/link";
import {
  getExternalLinkProps,
  getTemplateHref,
  type ContentLink,
  type HomeTemplateId,
} from "@/lib/portfolio";

type ContentLinkViewProps = {
  children: React.ReactNode;
  className: string;
  contentDebug?: boolean;
  homeTemplate?: HomeTemplateId;
  link: ContentLink;
};

export function ContentLinkView({
  children,
  className,
  contentDebug,
  homeTemplate,
  link,
}: ContentLinkViewProps) {
  if (link.external) {
    return (
      <a className={className} href={link.href} {...getExternalLinkProps(link)}>
        {children}
      </a>
    );
  }

  return (
    <Link
      className={className}
      href={getTemplateHref(link.href, homeTemplate, { contentDebug })}
    >
      {children}
    </Link>
  );
}
