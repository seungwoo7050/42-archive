import type { HomeTemplateId } from "./types";

export function createTemplateHref(
  href: string,
  templateId: HomeTemplateId | undefined,
  defaultTemplateId: HomeTemplateId,
  options: { alwaysInclude?: boolean; contentDebug?: boolean } = {},
) {
  if (!templateId || !href.startsWith("/") || href.startsWith("//")) {
    return href;
  }

  const hashIndex = href.indexOf("#");
  const withoutHash = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : href.slice(hashIndex);
  const [pathname, query] = withoutHash.split("?", 2);
  const params = new URLSearchParams(query);
  const shouldIncludeView =
    options.alwaysInclude || templateId !== defaultTemplateId;

  if (shouldIncludeView) {
    params.set("view", templateId);
  } else {
    params.delete("view");
  }

  if (options.contentDebug) {
    params.set("debug", "content");
  }

  const queryString = params.toString();

  return `${pathname}${queryString ? `?${queryString}` : ""}${hash}`;
}
