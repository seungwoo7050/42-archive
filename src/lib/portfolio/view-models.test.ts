import { describe, expect, it } from "vitest";

import { getPortfolioContent } from "./content";
import {
  createAboutViewModel,
  createContactViewModel,
  createHomeViewModel,
  createProjectDetailViewModel,
  createProjectIndexViewModel,
  createResumeViewModel,
} from "./view-models";

describe("portfolio route view models", () => {
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
});
