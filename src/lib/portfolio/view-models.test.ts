import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { getPortfolioContent } from "./content";
import {
  createAboutViewModel,
  createContactViewModel,
  createHomeViewModel,
  createInterviewMapViewModel,
  createJourneyViewModel,
  createProjectDetailViewModel,
  createProjectIndexViewModel,
  createResumeViewModel,
} from "./view-models";

describe("portfolio route view models", () => {
  it("exposes only the shared shell fields and route-specific data", () => {
    const content = getPortfolioContent();
    const project = content.projects[0];

    expect(project).toBeDefined();

    const viewModels = [
      {
        sourceFields: [
          "contact",
          "journey",
          "journeyNarrative",
          "presentation",
          "profile",
          "site",
          "skills",
          "techStack",
        ],
        viewModel: createHomeViewModel(content),
      },
      {
        sourceFields: ["contact", "presentation", "profile", "projects", "site"],
        viewModel: createProjectIndexViewModel(content),
      },
      {
        sourceFields: ["presentation", "profile", "site"],
        viewModel: createProjectDetailViewModel(content, project.id),
      },
      {
        sourceFields: [
          "contact",
          "curation",
          "experience",
          "journey",
          "presentation",
          "profile",
          "site",
          "skills",
        ],
        viewModel: createAboutViewModel(content),
      },
      {
        sourceFields: [
          "experience",
          "presentation",
          "profile",
          "resume",
          "site",
        ],
        viewModel: createResumeViewModel(content),
      },
      {
        sourceFields: ["contact", "presentation", "profile", "site"],
        viewModel: createContactViewModel(content),
      },
      {
        sourceFields: [
          "journey",
          "journeyNarrative",
          "presentation",
          "profile",
          "site",
        ],
        viewModel: createJourneyViewModel(content),
      },
      {
        sourceFields: ["interviewMap", "presentation", "profile", "site"],
        viewModel: createInterviewMapViewModel(content),
      },
    ];

    for (const { sourceFields, viewModel } of viewModels) {
      expect(viewModel).not.toBeNull();
      if (!viewModel) throw new Error("expected a route view model");

      expect(viewModel).toEqual(
        expect.objectContaining({
          footerLinks: expect.any(Array),
          presentation: content.presentation,
          profile: content.profile,
          site: content.site,
        }),
      );
      expect(
        Object.keys(viewModel)
          .filter((key) => Object.hasOwn(content, key))
          .sort(),
      ).toEqual(sourceFields);
    }
  });

  it("does not build route models by spreading the full content object", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/lib/portfolio/view-models.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/PortfolioContent\s*&/);
    expect(source).not.toMatch(/\.\.\.content\b/);
  });

  it("prepares home selections, metrics, and links before rendering", () => {
    const content = getPortfolioContent();
    const viewModel = createHomeViewModel(
      content,
      new Date("2026-07-23T00:00:00.000Z"),
    );

    expect(viewModel.route).toBe("home");
    expect(viewModel.currentYear).toBe(2026);
    expect(viewModel).not.toHaveProperty("content");
    expect(viewModel.featuredProjects).toEqual(
      content.projects.filter((project) => project.featured),
    );
    expect(viewModel.leadProject).toBe(
      viewModel.featuredProjects[0] ?? content.projects[0] ?? null,
    );
    expect(viewModel.heroLinks.every((link) =>
      link.placements?.includes("hero"),
    )).toBe(true);
    expect(viewModel.footerLinks.every((link) =>
      link.placements?.includes("footer"),
    )).toBe(true);
    expect(viewModel.metricValues).toEqual(
      expect.objectContaining({
        curriculumCount: expect.any(Number),
        productCount: expect.any(Number),
        reliabilityCount: expect.any(Number),
      }),
    );
  });

  it("groups the project index in configured order and resolves metric values", () => {
    const content = getPortfolioContent();
    const viewModel = createProjectIndexViewModel(content);
    const groupOrder = content.projectGroups.map((group) => group.id);
    const renderedProjectIds = viewModel.groups.flatMap((group) =>
      group.projects.map((project) => project.id),
    );

    expect(viewModel.route).toBe("projects");
    expect(viewModel.contact).toBe(content.contact);
    expect(viewModel.groups.map((group) => group.id)).toEqual(
      [...viewModel.groups.map((group) => group.id)].sort(
        (left, right) => groupOrder.indexOf(left) - groupOrder.indexOf(right),
      ),
    );
    expect(renderedProjectIds).toEqual(
      expect.arrayContaining(content.projects.map((project) => project.id)),
    );
    expect(new Set(renderedProjectIds).size).toBe(content.projects.length);
    expect(viewModel.metrics.map((metric) => metric.value)).toEqual(
      expect.arrayContaining(viewModel.metrics.map(() => expect.any(Number))),
    );
  });

  it("resolves project-detail links, stack labels, and supporting images", () => {
    const content = getPortfolioContent();
    const project = content.projects[0];

    expect(project).toBeDefined();
    const viewModel = createProjectDetailViewModel(content, project.id);

    expect(viewModel).not.toBeNull();
    expect(viewModel?.route).toBe("project-detail");
    expect(viewModel?.project).toBe(project);
    expect(viewModel?.detailLinks.every((link) =>
      link.placements?.includes("detail"),
    )).toBe(true);
    expect(viewModel?.stackItems.map((item) => item.id)).toEqual(project.stack);
    expect(
      viewModel?.supportingImages.every(
        (image) => image.src !== project.screenshot.src,
      ),
    ).toBe(true);
    expect(createProjectDetailViewModel(content, "missing-project")).toBeNull();
  });

  it("resolves about curation references without making renderers search projects", () => {
    const content = getPortfolioContent();
    const viewModel = createAboutViewModel(content);

    expect(viewModel.route).toBe("about");
    expect(viewModel.contact).toBe(content.contact);
    expect(viewModel.curationCategories).toHaveLength(
      content.curation.categories.length,
    );
    for (const category of viewModel.curationCategories) {
      expect(category.projects.map((project) => project.id)).toEqual(
        category.projectIds.filter((projectId) =>
          content.projects.some((project) => project.id === projectId),
        ),
      );
    }
  });

  it("keeps the resume project order and omits unknown references", () => {
    const content = structuredClone(getPortfolioContent());
    content.resume.projectIds = [
      ...content.resume.projectIds.slice().reverse(),
      "missing-project",
    ];

    const viewModel = createResumeViewModel(content);

    expect(viewModel.route).toBe("resume");
    expect(viewModel.resumeProjects.map((project) => project.id)).toEqual(
      content.resume.projectIds.filter((projectId) =>
        content.projects.some((project) => project.id === projectId),
      ),
    );
  });

  it("keeps preferred contact order and prepares the cinematic fallback", () => {
    const content = getPortfolioContent();
    const viewModel = createContactViewModel(content);

    expect(viewModel.route).toBe("contact");
    expect(viewModel.preferredLinks.map((link) => link.id)).toEqual(
      content.contact.preferred.filter((id) =>
        content.links.some((link) => link.id === id),
      ),
    );
    expect(viewModel.cinematicLinks).toEqual(
      viewModel.preferredLinks.length > 0
        ? viewModel.preferredLinks
        : viewModel.contactPlacementLinks,
    );
  });

  it("resolves journey milestone projects before rendering", () => {
    const content = structuredClone(getPortfolioContent());
    const firstMilestone = content.journeyNarrative.milestones[0];

    expect(firstMilestone).toBeDefined();
    firstMilestone.anchorProjectIds = [
      ...firstMilestone.anchorProjectIds,
      "missing-project",
    ];

    const viewModel = createJourneyViewModel(content);

    expect(viewModel.route).toBe("journey");
    expect(viewModel.milestones[0]?.anchorProjects.map((project) => project.id)).toEqual(
      firstMilestone.anchorProjectIds.filter((projectId) =>
        content.projects.some((project) => project.id === projectId),
      ),
    );
  });

  it("resolves interview-map answers before rendering", () => {
    const content = structuredClone(getPortfolioContent());
    const firstAnswer = content.interviewMap.tracks[0]?.items[0]?.answers[0];

    expect(firstAnswer).toBeDefined();
    if (firstAnswer) firstAnswer.projectId = "missing-project";

    const viewModel = createInterviewMapViewModel(content);
    const answer = viewModel.tracks[0]?.items[0]?.answers[0];

    expect(viewModel.route).toBe("interview-map");
    expect(answer).toEqual(
      expect.objectContaining({
        project: null,
        projectId: "missing-project",
      }),
    );
  });
});
