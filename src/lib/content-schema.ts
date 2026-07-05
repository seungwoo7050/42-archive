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

export const portfolioProjectSourceSchema = z
  .object({
    id: contentId,
    order: nonEmptyString,
    title: nonEmptyString,
    groupId: contentId,
    tags: z.array(contentId),
    featured: z.boolean().optional(),
    enabled: z.boolean().optional(),
    period: nonEmptyString,
    role: nonEmptyString,
    summary: nonEmptyString,
    description: nonEmptyString,
    deployment: z
      .object({
        status: deploymentStatusSchema,
        label: nonEmptyString,
        showBadge: z.boolean().optional(),
      })
      .strict(),
    screenshot: projectImageSchema,
    screenshots: z.array(projectImageSchema),
    stack: z.array(contentId),
    links: z.array(contentLinkSchema),
    highlights: z.array(nonEmptyString),
    problem: nonEmptyString,
    solution: nonEmptyString,
    architecture: z
      .object({
        summary: nonEmptyString,
        items: z.array(nonEmptyString),
      })
      .strict(),
    decisions: z.array(nonEmptyString),
    tradeoffs: z.array(nonEmptyString),
    results: z.array(nonEmptyString),
  })
  .strict();

export const projectsContentSchema = z
  .object({
    groups: z.array(projectGroupSchema).min(1),
    metrics: z.array(projectMetricSchema),
    items: z.array(portfolioProjectSourceSchema).min(1),
  })
  .strict();

const sectionCopySchema = z
  .object({
    actionLabel: nonEmptyString.optional(),
    title: nonEmptyString,
    body: nonEmptyString.optional(),
  })
  .strict();

const homeSectionIdSchema = z.enum([
  "contact",
  "featured",
  "journey",
  "stack",
  "technicalFocus",
  "workMap",
]);

const editorialHomeSectionsSchema = z
  .array(z.enum(["hero", "lead", "featured", "principles", "contact"]))
  .min(1)
  .refine((sections) => new Set(sections).size === sections.length, {
    message: "Editorial home section IDs must be unique.",
  });

const brutalistHomeSectionsSchema = z
  .array(z.enum(["hero", "signal", "featured", "system", "journey", "contact"]))
  .min(1)
  .refine((sections) => new Set(sections).size === sections.length, {
    message: "Brutalist home section IDs must be unique.",
  });

const cinematicHomeSectionsSchema = z
  .array(z.enum(["hero", "statement", "projects", "focusContact"]))
  .min(1)
  .refine((sections) => new Set(sections).size === sections.length, {
    message: "Cinematic home section IDs must be unique.",
  });

export const siteDesignIdSchema = z.enum([
  "design",
  "classic",
  "editorial",
  "brutalist",
  "cinematic",
]);

const workMapCountKeySchema = z.enum([
  "curriculumCount",
  "productCount",
  "reliabilityCount",
]);

const projectPageCountKeySchema = z.enum([
  "curriculumCount",
  "projectCount",
  "sourceOnlyCount",
]);

const presentationPageTitleSchema = z.object({ title: nonEmptyString }).passthrough();
const eyebrowTitleSchema = z
  .object({ eyebrow: nonEmptyString, title: nonEmptyString })
  .strict();
const projectDetailSectionSchema = eyebrowTitleSchema;
const projectPageContentSchema = z
  .object({
    groups: z.array(
      z.object({ category: nonEmptyString, body: nonEmptyString }).strict(),
    ),
    design: z
      .object({
        hero: z
          .object({
            title: nonEmptyString,
            body: nonEmptyString,
            stats: z
              .object({
                visibleEntries: nonEmptyString,
                archive: nonEmptyString,
                sourceFirst: nonEmptyString,
              })
              .strict(),
          })
          .strict(),
        featured: z
          .object({
            eyebrow: nonEmptyString,
            title: nonEmptyString,
            body: nonEmptyString,
          })
          .strict(),
        group: z.object({ countLabel: nonEmptyString }).strict(),
      })
      .strict(),
    classic: z
      .object({
        hero: z
          .object({
            eyebrow: nonEmptyString,
            title: nonEmptyString,
            body: nonEmptyString,
            stats: z.array(
              z
                .object({
                  label: nonEmptyString,
                  countKey: projectPageCountKeySchema,
                })
                .strict(),
            ),
          })
          .strict(),
        terminal: z
          .object({
            ariaLabel: nonEmptyString,
            title: nonEmptyString,
            promptUser: nonEmptyString,
            promptPath: nonEmptyString,
            command: nonEmptyString,
            entryLabel: nonEmptyString,
            maxGroups: z.number().int().positive(),
          })
          .strict(),
        selected: z
          .object({
            eyebrow: nonEmptyString,
            title: nonEmptyString,
            body: nonEmptyString,
          })
          .strict(),
        grouped: z
          .object({
            eyebrow: nonEmptyString,
            title: nonEmptyString,
            body: nonEmptyString,
            countLabel: nonEmptyString,
          })
          .strict(),
      })
      .strict(),
    editorial: z
      .object({
        hero: z
          .object({ title: nonEmptyString, body: nonEmptyString })
          .strict(),
        archiveAriaLabel: nonEmptyString,
        groupKickerTemplate: nonEmptyString,
      })
      .strict(),
    brutalist: z
      .object({
        hero: z
          .object({
            eyebrow: nonEmptyString,
            title: nonEmptyString,
            body: nonEmptyString,
          })
          .strict(),
      })
      .strict(),
    cinematic: z
      .object({
        hero: z
          .object({
            eyebrow: nonEmptyString,
            entryLabel: nonEmptyString,
            title: nonEmptyString,
            body: nonEmptyString,
          })
          .strict(),
      })
      .strict(),
  })
  .passthrough();

export const presentationContentSchema = z
  .object({
    defaultHomeTemplate: siteDesignIdSchema,
    templates: z.array(
      z
        .object({
          id: siteDesignIdSchema,
          label: nonEmptyString,
          description: nonEmptyString,
        })
        .passthrough(),
    ),
    ui: z
      .object({
        debugPrefix: nonEmptyString,
        skipLinkLabel: nonEmptyString,
        primaryNavigationAriaLabel: nonEmptyString,
        mobileNavigationAriaLabel: nonEmptyString,
        menuLabel: nonEmptyString,
        designSwitcherAriaTemplate: nonEmptyString,
        designSwitcherCountTemplate: nonEmptyString,
        designSwitcherCloseLabel: nonEmptyString,
        designNavigationAriaLabel: nonEmptyString,
        journeyCaseStudyLabel: nonEmptyString,
        techMarqueeAriaLabel: nonEmptyString,
        animatedTerminalAriaLabel: nonEmptyString,
        projectNavigationAriaLabel: nonEmptyString,
        readCaseStudyAriaTemplate: nonEmptyString,
        openItemAriaTemplate: nonEmptyString,
        nowLabel: nonEmptyString,
        emptyStates: z
          .object({
            projectsHome: nonEmptyString,
            projectsArchive: nonEmptyString,
            journey: nonEmptyString,
            projectDetails: nonEmptyString,
            noMappedEvidence: nonEmptyString,
            additionalNotes: nonEmptyString,
            contactLinks: nonEmptyString,
          })
          .strict(),
      })
      .strict(),
    editorial: z
      .object({
        shell: z
          .object({ kicker: nonEmptyString, volumeLabel: nonEmptyString })
          .strict(),
      })
      .strict(),
    brutalist: z
      .object({
        shell: z
          .object({ debugLabel: nonEmptyString, debugHint: nonEmptyString })
          .strict(),
      })
      .strict(),
    cinematic: z
      .object({
        shell: z.object({ brandSubtitle: nonEmptyString }).strict(),
      })
      .strict(),
    home: z
      .object({
        design: z
          .object({
            hero: z
              .object({
                primaryActionLabel: nonEmptyString,
                leadLabel: nonEmptyString,
                leadActionLabel: nonEmptyString,
                stats: z.array(
                  z
                    .object({
                      label: nonEmptyString,
                      countKey: workMapCountKeySchema,
                    })
                    .strict(),
                ),
              })
              .strict(),
            sections: z.array(homeSectionIdSchema),
            featured: sectionCopySchema,
          })
          .strict(),
        classic: z
          .object({
            hero: z.object({ primaryActionLabel: nonEmptyString }).strict(),
            sections: z.array(homeSectionIdSchema),
            featured: sectionCopySchema,
            terminal: z
              .object({
                title: nonEmptyString,
                bootLine: nonEmptyString,
                promptUser: nonEmptyString,
                promptPath: nonEmptyString,
                commands: z.array(
                  z
                    .object({
                      command: nonEmptyString,
                      output: z.array(nonEmptyString),
                    })
                    .strict(),
                ),
              })
              .strict(),
          })
          .strict(),
        editorial: z
          .object({
            sections: editorialHomeSectionsSchema,
            hero: z
              .object({
                issueTemplate: nonEmptyString,
                primaryActionLabel: nonEmptyString,
              })
              .strict(),
            lead: z
              .object({ label: nonEmptyString, actionLabel: nonEmptyString })
              .strict(),
            featured: z.object({ title: nonEmptyString }).strict(),
            current: z.object({ actionLabel: nonEmptyString }).strict(),
          })
          .strict(),
        brutalist: z
          .object({
            sections: brutalistHomeSectionsSchema,
            stampLabel: nonEmptyString,
            signalText: nonEmptyString,
            hero: z
              .object({
                primaryActionLabel: nonEmptyString,
                secondaryActionLabel: nonEmptyString,
              })
              .strict(),
            featured: z
              .object({
                title: nonEmptyString,
                body: nonEmptyString,
                actionLabel: nonEmptyString,
              })
              .strict(),
            system: z
              .object({ title: nonEmptyString, body: nonEmptyString })
              .strict(),
            journeyActionLabel: nonEmptyString,
            contactActionLabel: nonEmptyString,
          })
          .strict(),
        cinematic: z
          .object({
            sections: cinematicHomeSectionsSchema,
            hero: z
              .object({
                primaryActionLabel: nonEmptyString,
                secondaryActionLabel: nonEmptyString,
              })
              .strict(),
            statementLabel: nonEmptyString,
            focusLabel: nonEmptyString,
            contactActionLabel: nonEmptyString,
            caseStudyActionLabel: nonEmptyString,
          })
          .strict(),
        shared: z
          .object({
            workMap: sectionCopySchema.extend({
              cards: z.array(
                z
                  .object({
                    id: contentId,
                    label: nonEmptyString,
                    body: nonEmptyString,
                    countKey: workMapCountKeySchema,
                  })
                  .strict(),
              ),
            }),
            technicalFocus: sectionCopySchema,
            stack: sectionCopySchema,
            journey: sectionCopySchema,
            contact: z
              .object({
                actionLabel: nonEmptyString,
                title: nonEmptyString,
              })
              .strict(),
          })
          .strict(),
      })
      .passthrough(),
    pages: z
      .object({
        about: z
          .object({
            hero: presentationPageTitleSchema,
            principles: presentationPageTitleSchema,
            journey: presentationPageTitleSchema,
            skills: presentationPageTitleSchema,
            curation: presentationPageTitleSchema.extend({
              body: nonEmptyString,
              criteriaTitle: nonEmptyString,
              categoriesTitle: nonEmptyString,
              omissionsTitle: nonEmptyString,
              nextReviewTitle: nonEmptyString,
            }),
            editorial: z
              .object({
                heroEyebrowTemplate: nonEmptyString,
                curationEyebrow: nonEmptyString,
              })
              .strict(),
            brutalist: z
              .object({
                heroEyebrowTemplate: nonEmptyString,
                principleItemLabel: nonEmptyString,
                focusItemLabel: nonEmptyString,
              })
              .strict(),
          })
          .passthrough(),
        contact: z
          .object({
            availability: presentationPageTitleSchema,
            notes: presentationPageTitleSchema,
            editorial: z
              .object({ heroEyebrowTemplate: nonEmptyString })
              .strict(),
            brutalist: z.object({ heroEyebrow: nonEmptyString }).strict(),
          })
          .passthrough(),
        interviewMap: z
          .object({
            hero: z
              .object({ title: nonEmptyString, eyebrow: nonEmptyString })
              .strict(),
            tracks: z
              .object({
                title: nonEmptyString,
                answerLabel: nonEmptyString,
                depthLabel: nonEmptyString,
                referenceLabel: nonEmptyString,
                emptyLabel: nonEmptyString,
                indexLabel: nonEmptyString,
                itemCountTemplate: nonEmptyString,
                questionLabel: nonEmptyString,
              })
              .strict(),
            gaps: z
              .object({ ariaLabel: nonEmptyString, eyebrow: nonEmptyString })
              .strict(),
          })
          .passthrough(),
        journey: z
          .object({
            hero: z
              .object({ title: nonEmptyString, eyebrow: nonEmptyString })
              .strict(),
            narrative: z
              .object({
                title: nonEmptyString,
                body: nonEmptyString,
                labels: z
                  .object({
                    state: nonEmptyString,
                    reason: nonEmptyString,
                    result: nonEmptyString,
                  })
                  .strict(),
              })
              .strict(),
            timeline: z
              .object({ title: nonEmptyString, body: nonEmptyString })
              .strict(),
            now: z
              .object({ title: nonEmptyString, anchorLabel: nonEmptyString })
              .strict(),
          })
          .passthrough(),
        projectDetail: z
          .object({
            backLabel: nonEmptyString,
            caseLabel: nonEmptyString,
            missing: z
              .object({
                eyebrow: nonEmptyString,
                title: nonEmptyString,
                body: nonEmptyString,
                actionLabel: nonEmptyString,
              })
              .strict(),
            facts: z
              .object({ roleLabel: nonEmptyString, statusLabel: nonEmptyString })
              .strict(),
            outroLabel: nonEmptyString,
            returnToIndexLabel: nonEmptyString,
            frameLabel: nonEmptyString,
            editorial: z
              .object({ decisionSpreadTitle: nonEmptyString })
              .strict(),
            sections: z
              .object({
                architecture: projectDetailSectionSchema,
                decisions: projectDetailSectionSchema,
                highlights: projectDetailSectionSchema,
                problem: projectDetailSectionSchema,
                result: projectDetailSectionSchema,
                screenshots: projectDetailSectionSchema,
                solution: projectDetailSectionSchema,
                stack: projectDetailSectionSchema,
                tradeoffs: projectDetailSectionSchema,
              })
              .strict(),
          })
          .passthrough(),
        projects: projectPageContentSchema,
        resume: z
          .object({
            hero: z
              .object({
                title: nonEmptyString,
                body: nonEmptyString,
                downloadLabel: nonEmptyString,
              })
              .strict(),
            summary: presentationPageTitleSchema,
            projects: z
              .object({
                title: nonEmptyString,
                caseStudyLabel: nonEmptyString,
              })
              .strict(),
            training: presentationPageTitleSchema,
            experience: presentationPageTitleSchema,
            education: presentationPageTitleSchema,
            notes: presentationPageTitleSchema,
            identity: z
              .object({
                locationLabel: nonEmptyString,
                availabilityLabel: nonEmptyString,
              })
              .strict(),
            editorial: z.object({ heroEyebrow: nonEmptyString }).strict(),
            brutalist: z
              .object({ heroEyebrowTemplate: nonEmptyString })
              .strict(),
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

export const techStackIconSchema = z.enum([
  "api",
  "box",
  "c",
  "check",
  "cmake",
  "cplusplus",
  "database",
  "docker",
  "eslint",
  "flow",
  "json",
  "nextjs",
  "nodejs",
  "playwright",
  "postgresql",
  "prisma",
  "react",
  "redis",
  "shield",
  "tailwind",
  "terminal",
  "tool",
  "typescript",
  "vitest",
]);

export const techStackContentSchema = z.array(
  z
    .object({
      id: contentId,
      label: nonEmptyString,
      icon: techStackIconSchema,
      color,
    })
    .strict(),
);

export const skillsContentSchema = z
  .object({
    focusAreas: z.array(
      z.object({ title: nonEmptyString, body: nonEmptyString }).strict(),
    ),
    groups: z.array(
      z.object({ title: nonEmptyString, items: z.array(nonEmptyString) }).strict(),
    ),
  })
  .strict();

export const experienceContentSchema = z.array(
  z
    .object({
      period: nonEmptyString,
      title: nonEmptyString,
      body: nonEmptyString,
    })
    .strict(),
);

export const journeyContentSchema = z.array(
  z
    .object({
      date: nonEmptyString,
      endDate: nonEmptyString.nullable(),
      title: nonEmptyString,
      category: nonEmptyString,
      body: nonEmptyString,
      projectId: contentId.nullable(),
      sourcePath: nonEmptyString.nullable(),
    })
    .strict(),
);

export const linksContentSchema = z.array(contentLinkSchema);

export const contactContentSchema = z
  .object({
    title: nonEmptyString,
    intro: nonEmptyString,
    availability: nonEmptyString,
    preferred: z.array(contentId),
    notes: z.array(nonEmptyString),
  })
  .strict();

export const resumeContentSchema = z
  .object({
    downloadUrl: contentAssetPathSchema.nullable(),
    summary: z.array(nonEmptyString),
    projectIds: z.array(contentId),
    training: z.array(
      z
        .object({
          name: nonEmptyString,
          period: nonEmptyString,
          description: nonEmptyString,
        })
        .strict(),
    ),
    education: z.array(
      z
        .object({
          name: nonEmptyString,
          period: nonEmptyString,
          description: nonEmptyString,
        })
        .strict(),
    ),
    notes: z.array(nonEmptyString),
  })
  .strict();

export const journeyNarrativeContentSchema = z
  .object({
    intro: nonEmptyString,
    milestones: z.array(
      z
        .object({
          id: contentId,
          date: nonEmptyString,
          title: nonEmptyString,
          state: nonEmptyString,
          reason: nonEmptyString,
          result: nonEmptyString,
          anchorProjectIds: z.array(contentId),
        })
        .strict(),
    ),
    currentPosition: z
      .object({ title: nonEmptyString, body: nonEmptyString })
      .strict(),
  })
  .strict();

export const interviewMapContentSchema = z
  .object({
    intro: nonEmptyString,
    referenceRepo: z
      .object({ label: nonEmptyString, href: contentHrefSchema })
      .strict(),
    tracks: z.array(
      z
        .object({
          id: contentId,
          label: nonEmptyString,
          body: nonEmptyString,
          items: z.array(
            z
              .object({
                label: nonEmptyString,
                reference: contentHrefSchema,
                answers: z.array(
                  z
                    .object({
                      projectId: contentId,
                      depth: nonEmptyString,
                    })
                    .strict(),
                ),
              })
              .strict(),
          ),
        })
        .strict(),
    ),
    gaps: z
      .object({
        title: nonEmptyString,
        body: nonEmptyString,
        items: z.array(nonEmptyString),
      })
      .strict(),
  })
  .strict();

export const curationContentSchema = z
  .object({
    intro: nonEmptyString,
    criteria: z
      .object({
        title: nonEmptyString,
        items: z.array(
          z.object({ title: nonEmptyString, body: nonEmptyString }).strict(),
        ),
      })
      .strict(),
    categories: z.array(
      z
        .object({
          id: contentId,
          label: nonEmptyString,
          rationale: nonEmptyString,
          projectIds: z.array(contentId),
        })
        .strict(),
    ),
    omissions: z
      .object({
        title: nonEmptyString,
        body: nonEmptyString,
        items: z.array(
          z.object({ title: nonEmptyString, body: nonEmptyString }).strict(),
        ),
      })
      .strict(),
    nextReview: z
      .object({ title: nonEmptyString, body: nonEmptyString })
      .strict(),
  })
  .strict();

export type ProjectGroup = z.infer<typeof projectGroupSchema>;
export type ProjectMetric = z.infer<typeof projectMetricSchema>;
export type ProjectMetricFilter = z.infer<typeof projectMetricFilterSchema>;
export type PortfolioProjectSource = z.infer<
  typeof portfolioProjectSourceSchema
>;
export type ProjectsContentSource = z.infer<typeof projectsContentSchema>;
export type PresentationContentSource = z.infer<
  typeof presentationContentSchema
>;
