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

export const siteContentSchema = z
  .object({
    title: nonEmptyString,
    description: nonEmptyString,
    language: nonEmptyString,
    brand: nonEmptyString,
    socialImage: contentAssetPathSchema.optional(),
    pages: z
      .object({
        projects: z.boolean(),
        about: z.boolean(),
        resume: z.boolean(),
        contact: z.boolean(),
        journey: z.boolean(),
        interviewMap: z.boolean(),
        curation: z.boolean(),
      })
      .strict()
      .optional(),
    navigation: z.array(navigationItemSchema),
    footer: z
      .object({
        note: nonEmptyString,
        copyright: nonEmptyString,
      })
      .strict(),
  })
  .passthrough();

export const profileContentSchema = z
  .object({
    name: nonEmptyString,
    koreanName: z.string(),
    handle: nonEmptyString,
    role: nonEmptyString,
    headline: nonEmptyString,
    summary: nonEmptyString,
    location: nonEmptyString,
    availability: nonEmptyString,
    photo: z
      .object({
        src: contentAssetPathSchema,
        alt: nonEmptyString,
      })
      .strict()
      .optional(),
    principles: z.array(
      z
        .object({
          title: nonEmptyString,
          body: nonEmptyString,
        })
        .strict(),
    ),
  })
  .strict();

export const linkTypeSchema = z.enum([
  "case-study",
  "demo",
  "email",
  "github",
  "resume",
  "source",
  "website",
]);

export const contentLinkSchema = z
  .object({
    id: contentId.optional(),
    type: linkTypeSchema,
    label: nonEmptyString,
    href: contentHrefSchema,
    external: z.boolean().optional(),
    enabled: z.boolean().optional(),
    placements: z
      .array(z.enum(["hero", "contact", "card", "detail", "footer"]))
      .optional(),
  })
  .strict();

export const deploymentStatusSchema = z.enum([
  "archived",
  "case-study-only",
  "live",
  "offline",
  "private",
  "source-only",
]);

const projectImageSchema = z
  .object({
    src: contentAssetPathSchema,
    alt: nonEmptyString,
  })
  .strict();

export const projectGroupSchema = z
  .object({
    id: contentId,
    label: nonEmptyString,
    description: nonEmptyString,
    order: z.number().int().nonnegative(),
  })
  .strict();

export const projectMetricFilterSchema = z
  .object({
    projectIds: z.array(contentId).min(1).optional(),
    groupIds: z.array(contentId).min(1).optional(),
    tags: z.array(contentId).min(1).optional(),
    featured: z.boolean().optional(),
    deploymentStatuses: z.array(deploymentStatusSchema).min(1).optional(),
  })
  .strict();

export const projectMetricSchema = z
  .object({
    id: contentId,
    label: nonEmptyString,
    description: nonEmptyString.optional(),
    aggregate: z.enum(["projects", "highlights"]),
    filter: projectMetricFilterSchema.optional(),
  })
  .strict();
