import { resolve } from "node:path";

import contactJson from "@/content/contact.json";
import linksJson from "@/content/links.json";
import presentationJson from "@/content/presentation.json";
import projectsJson from "@/content/projects.json";
import resumeJson from "@/content/resume.json";
import siteJson from "@/content/site.json";
import { SITE_DESIGN_IDS } from "@/designs/config";
import { describe, expect, it } from "vitest";

import * as portfolio from "./portfolio";
import { validatePortfolioAssets } from "./content-assets";
import { loadPortfolioSource, PortfolioContentError } from "./content-loader";
import {
  getFeaturedProjects,
  getPortfolioContent,
  getProjectCardLinks,
  getProjectMetricValue,
  getResumeProjects,
  getTemplateHref,
  isProjectLive,
  resolveContentDebug,
  resolveHomeTemplateId,
  type PortfolioProject,
  type ProjectMetricFilter,
  type SiteDesignId,
} from "./portfolio";

const designIds = [
  "design",
  "classic",
  "editorial",
  "brutalist",
  "cinematic",
] as const satisfies readonly SiteDesignId[];

function projectMatchesFilter(
  project: PortfolioProject,
  filter: ProjectMetricFilter | undefined,
) {
  if (!filter) return true;

  return (
    (!filter.projectIds || filter.projectIds.includes(project.id)) &&
    (!filter.groupIds || filter.groupIds.includes(project.groupId)) &&
    (!filter.tags || filter.tags.every((tag) => project.tags.includes(tag))) &&
    (filter.featured === undefined ||
      Boolean(project.featured) === filter.featured) &&
    (!filter.deploymentStatuses ||
      filter.deploymentStatuses.includes(project.deployment.status))
  );
}

function captureContentError(run: () => unknown) {
  let caught: unknown;

  try {
    run();
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(PortfolioContentError);
  return caught as PortfolioContentError;
}

describe("portfolio content", () => {
  it("preserves the public module surface and clone boundaries", () => {
    expect(Object.keys(portfolio).sort()).toEqual(
      [
        "getContentLinksByPlacement",
        "getEnabledLinks",
        "getExternalLinkProps",
        "getFeaturedProjects",
        "getPortfolioContent",
        "getPreferredContactLinks",
        "getProjectById",
        "getProjectCardLinks",
        "getProjectDetailLinks",
        "getProjectLink",
        "getProjectLinksForPlacement",
        "getProjectMetricValue",
        "getResumeProjects",
        "getTemplateHref",
        "isProjectLive",
        "isSitePageEnabled",
        "resolveContentDebug",
        "resolveHomeTemplateId",
        "resolveTechStackItem",
      ].sort(),
    );

    const first = getPortfolioContent();
    const second = getPortfolioContent();

    expect(first).not.toBe(second);
    expect(first.projects).not.toBe(second.projects);
    expect(first.projects[0]).not.toBe(second.projects[0]);
    expect(first.projects[0].links).not.toBe(second.projects[0].links);
    expect(first.links).not.toBe(second.links);
    expect(first.site).toBe(second.site);
    expect(first.profile).toBe(second.profile);
    expect(first.presentation).toBe(second.presentation);
    expect(first.journey).toBe(second.journey);
  });

  it("loads and derives the reusable projects content model", () => {
    const source = validatePortfolioAssets(
      loadPortfolioSource(),
      resolve(process.cwd(), "public"),
    );
    const content = getPortfolioContent();
    const sourceGroups = new Map(
      source.projects.groups.map((group) => [group.id, group]),
    );

    expect(source.projects.groups.length).toBeGreaterThan(0);
    expect(source.projects.metrics.length).toBeGreaterThan(0);
    expect(source.projects.items.length).toBeGreaterThan(0);
    expect(new Set(source.projects.groups.map((group) => group.id)).size).toBe(
      source.projects.groups.length,
    );
    expect(new Set(source.projects.metrics.map((metric) => metric.id)).size).toBe(
      source.projects.metrics.length,
    );
    expect(new Set(source.projects.items.map((project) => project.id)).size).toBe(
      source.projects.items.length,
    );

    expect(content.projectGroups.map((group) => group.order)).toEqual(
      [...content.projectGroups.map((group) => group.order)].sort(
        (left, right) => left - right,
      ),
    );
    for (const project of content.projects) {
      expect(project.category).toBe(sourceGroups.get(project.groupId)?.label);
      expect(project.tags.length).toBeGreaterThan(0);
    }
  });

  it("exposes the complete five-design contract with editorial as the default", () => {
    const { presentation } = getPortfolioContent();

    expect(presentation.defaultHomeTemplate).toBe("editorial");
    expect(presentation.templates.map((template) => template.id)).toEqual(
      designIds,
    );
    expect(SITE_DESIGN_IDS).toEqual(designIds);

    const configurableSectionOrders = [
      presentation.home.editorial.sections,
      presentation.home.brutalist.sections,
      presentation.home.cinematic.sections,
    ];

    for (const sections of configurableSectionOrders) {
      expect(sections.length).toBeGreaterThan(0);
      expect(new Set(sections).size).toBe(sections.length);
    }

    expect(presentation.ui.skipLinkLabel).toMatch(/\S/);
    expect(presentation.ui.emptyStates.projectDetails).toMatch(/\S/);
  });

  it("keeps mutable assets in the documented content boundaries", () => {
    const content = getPortfolioContent();
    const assetPaths = [
      content.profile.photo?.src,
      content.resume.downloadUrl,
      ...content.projects.flatMap((project) => [
        project.screenshot.src,
        ...project.screenshots.map((image) => image.src),
      ]),
    ].filter((path): path is string => Boolean(path));

    expect(assetPaths.length).toBeGreaterThan(0);
    for (const path of assetPaths) {
      expect(path).toMatch(/^\/(?:content|template)\//);
    }

    expect(
      getPortfolioContent({
        NEXT_PUBLIC_DASHBOARD_URL: "https://environment-specific.example",
      }),
    ).toEqual(content);
  });

  it("reports missing assets with the source file and JSON path", () => {
    let caught: unknown;

    try {
      validatePortfolioAssets(
        loadPortfolioSource(),
        resolve(process.cwd(), ".missing-public-root"),
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(PortfolioContentError);
    const contentError = caught as PortfolioContentError;
    expect(contentError.issues.length).toBeGreaterThan(0);
    expect(
      contentError.issues.some(
        (issue) =>
          issue.file.startsWith("src/content/") &&
          issue.path.startsWith("$.") &&
          issue.message.includes("does not exist under public/"),
      ),
    ).toBe(true);
    expect(contentError.message).toContain("Portfolio content validation failed");
  });

  it("rejects duplicate IDs, missing designs, and unsupported navigation", () => {
    const projects = structuredClone(projectsJson);
    projects.items.push(structuredClone(projects.items[0]));
    const presentation = structuredClone(presentationJson);
    presentation.templates = presentation.templates.slice(0, -1);
    const site = structuredClone(siteJson);
    site.navigation.push({ label: "Unknown", href: "/not-a-route" });

    const error = captureContentError(() =>
      loadPortfolioSource({ projects, presentation, site }),
    );

    expect(error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: "src/content/projects.json",
          message: expect.stringContaining("Duplicate project id"),
        }),
        expect.objectContaining({
          file: "src/content/presentation.json",
          message: expect.stringContaining("Missing supported site design"),
        }),
        expect.objectContaining({
          file: "src/content/site.json",
          message: expect.stringContaining("Unsupported internal navigation route"),
        }),
      ]),
    );
  });

  it("rejects navigation and references to disabled content", () => {
    const projects = structuredClone(projectsJson);
    const disabledProjectId = projects.items[0].id;
    projects.items[0].enabled = false;
    const resume = structuredClone(resumeJson);
    resume.projectIds = [disabledProjectId];

    const links = structuredClone(linksJson);
    const preferredLink = links.find((link) => link.id !== undefined);
    expect(preferredLink?.id).toBeDefined();
    if (!preferredLink?.id) return;
    preferredLink.enabled = false;
    const contact = structuredClone(contactJson);
    contact.preferred = [preferredLink.id];

    const site = structuredClone(siteJson);
    site.pages.projects = false;

    const error = captureContentError(() =>
      loadPortfolioSource({ contact, links, projects, resume, site }),
    );

    expect(error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: expect.stringContaining("navigation"),
          message: expect.stringContaining("disabled page"),
        }),
        expect.objectContaining({
          file: "src/content/resume.json",
          message: expect.stringContaining(disabledProjectId),
        }),
        expect.objectContaining({
          file: "src/content/contact.json",
          message: expect.stringContaining(preferredLink.id),
        }),
      ]),
    );
  });

  it("rejects unsupported internal links and missing project routes", () => {
    const links = structuredClone(linksJson);
    links[0].href = "/not-a-route";
    links[0].external = false;

    const projects = structuredClone(projectsJson);
    const projectWithLinks = projects.items.find(
      (project) => project.links.length > 0,
    );
    expect(projectWithLinks).toBeDefined();
    if (!projectWithLinks) return;
    projectWithLinks.links[0].href = "/projects/not-a-project";
    projectWithLinks.links[0].external = false;

    const error = captureContentError(() =>
      loadPortfolioSource({ links, projects }),
    );

    expect(error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: "src/content/links.json",
          message: expect.stringContaining("Unsupported internal link route"),
        }),
        expect.objectContaining({
          file: "src/content/projects.json",
          message: expect.stringContaining("unknown or disabled project"),
        }),
      ]),
    );
  });

  it("computes every declared metric from generic filters", () => {
    const content = getPortfolioContent();

    for (const metric of content.projectMetrics) {
      const matchingProjects = content.projects.filter((project) =>
        projectMatchesFilter(project, metric.filter),
      );
      const expectedValue =
        metric.aggregate === "highlights"
          ? matchingProjects.reduce(
              (total, project) => total + project.highlights.length,
              0,
            )
          : matchingProjects.length;

      expect(getProjectMetricValue(metric.id, content)).toBe(expectedValue);
    }

    expect(getProjectMetricValue("not-a-declared-metric", content)).toBe(0);
  });

  it("selects featured, resume, and card links from content flags", () => {
    const content = getPortfolioContent();
    const expectedResumeIds = content.resume.projectIds.filter((projectId) =>
      content.projects.some((project) => project.id === projectId),
    );

    expect(getFeaturedProjects(content)).toEqual(
      content.projects.filter((project) => project.featured),
    );
    expect(getResumeProjects(content).map((project) => project.id)).toEqual(
      expectedResumeIds,
    );

    for (const project of content.projects) {
      const hasEnabledDemo = project.links.some(
        (link) => link.type === "demo" && link.enabled !== false,
      );
      expect(isProjectLive(project)).toBe(
        project.deployment.status === "live" && hasEnabledDemo,
      );
      expect(getProjectCardLinks(project).every((link) =>
        link.placements?.includes("card"),
      )).toBe(true);
      expect(
        getProjectCardLinks(project).some((link) => link.type === "demo"),
      ).toBe(isProjectLive(project) && project.links.some(
        (link) => link.type === "demo" && link.placements?.includes("card"),
      ));
    }
  });

  it("keeps journey entries chronological without assuming owner copy", () => {
    const { journey } = getPortfolioContent();
    const dates = journey.map((item) => item.date);

    expect(dates).toEqual([...dates].sort());
  });

  it("resolves all supported designs and falls back to editorial", () => {
    const { presentation } = getPortfolioContent();

    for (const designId of designIds) {
      expect(resolveHomeTemplateId(designId, presentation)).toBe(designId);
      expect(resolveHomeTemplateId([designId], presentation)).toBe(designId);
    }

    expect(resolveHomeTemplateId("missing", presentation)).toBe("editorial");
    expect(resolveHomeTemplateId(undefined, presentation)).toBe("editorial");
    expect(resolveContentDebug("content")).toBe(true);
    expect(resolveContentDebug(["content"])).toBe(true);
    expect(resolveContentDebug("off")).toBe(false);
  });

  it("propagates designs and debug state on internal links only", () => {
    for (const designId of designIds) {
      expect(getTemplateHref("/projects", designId)).toBe(
        designId === "editorial"
          ? "/projects"
          : `/projects?view=${designId}`,
      );
    }

    expect(getTemplateHref("/projects?page=2#featured", "cinematic")).toBe(
      "/projects?page=2&view=cinematic#featured",
    );
    expect(getTemplateHref("/projects?view=classic", "editorial")).toBe(
      "/projects",
    );
    expect(
      getTemplateHref("/", "editorial", { alwaysInclude: true }),
    ).toBe("/?view=editorial");
    expect(
      getTemplateHref("/projects", "brutalist", { contentDebug: true }),
    ).toBe("/projects?view=brutalist&debug=content");
    expect(getTemplateHref("https://example.com", "classic")).toBe(
      "https://example.com",
    );
    expect(getTemplateHref("//example.com/project", "classic")).toBe(
      "//example.com/project",
    );
  });
});
