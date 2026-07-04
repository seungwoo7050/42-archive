import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);
const contentId = nonEmptyString.regex(
  /^[a-z0-9]+(?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
  "Use a stable alphanumeric id (hyphens are allowed).",
);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color.");

export const contentHrefSchema = nonEmptyString.refine(
  (href) =>
    href.startsWith("/") ||
    href.startsWith("#") ||
    href.startsWith("https://") ||
    href.startsWith("http://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:"),
  "Use a root-relative path or an http(s), mailto, or tel URL.",
);

export const contentAssetPathSchema = nonEmptyString.refine(
  (assetPath) =>
    assetPath.startsWith("/content/") || assetPath.startsWith("/template/"),
  "Local assets must live under public/content or public/template.",
);

export const navigationItemSchema = z
  .object({
    label: nonEmptyString,
    href: contentHrefSchema,
  })
  .strict();
