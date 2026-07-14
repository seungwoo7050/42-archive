import { expect, test, type Locator, type Page } from "@playwright/test";

import contactJson from "../../src/content/contact.json";
import curationJson from "../../src/content/curation.json";
import experienceJson from "../../src/content/experience.json";
import interviewMapJson from "../../src/content/interview-map.json";
import journeyNarrativeJson from "../../src/content/journey-narrative.json";
import linksJson from "../../src/content/links.json";
import presentationJson from "../../src/content/presentation.json";
import profileJson from "../../src/content/profile.json";
import projectsJson from "../../src/content/projects.json";
import resumeJson from "../../src/content/resume.json";
import siteJson from "../../src/content/site.json";
import skillsJson from "../../src/content/skills.json";
import techStackJson from "../../src/content/tech-stack.json";

const designIds = [
  "design",
  "classic",
  "editorial",
  "brutalist",
  "cinematic",
] as const;
type DesignId = (typeof designIds)[number];

function requireFixture<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
}

const firstProject = requireFixture(
  projectsJson.items.find((project) => project.enabled !== false),
  "The portfolio needs at least one enabled project.",
);
const firstProjectTechnology = requireFixture(
  techStackJson.find((technology) => technology.id === firstProject.stack[0]),
  "The first project technology must resolve in E2E fixtures.",
);
const firstResumeProject = requireFixture(
  projectsJson.items.find((project) => project.id === resumeJson.projectIds[0]),
  "The first resume project must resolve in E2E fixtures.",
);
const firstInterviewAnswer = interviewMapJson.tracks[0]?.items[0]?.answers[0];
const firstInterviewProject = requireFixture(
  projectsJson.items.find(
    (project) => project.id === firstInterviewAnswer?.projectId,
  ),
  "The first interview project must resolve in E2E fixtures.",
);

const templateLabels = new Map(
  presentationJson.templates.map((template) => [template.id, template.label]),
);

const routeDefinitions = [
  { path: "/", pageId: undefined },
  { path: "/projects", pageId: "projects" },
  { path: `/projects/${firstProject.id}`, pageId: "projects" },
  { path: "/about", pageId: "about" },
  { path: "/resume", pageId: "resume" },
  { path: "/contact", pageId: "contact" },
  { path: "/journey", pageId: "journey" },
  { path: "/interview-map", pageId: "interviewMap" },
] as const;

const enabledRoutes = routeDefinitions.filter(
  ({ pageId }) => !pageId || siteJson.pages?.[pageId] !== false,
);

const projectsNavigation = siteJson.navigation.find(
  (item) => item.href === "/projects",
);

if (!projectsNavigation) {
  throw new Error("site.json must include a /projects navigation item.");
}

function withExplicitDesign(path: string, designId: DesignId) {
  const url = new URL(path, "https://portfolio.test");
  url.searchParams.set("view", designId);
  return `${url.pathname}${url.search}${url.hash}`;
}

function expectedInternalHref(
  path: string,
  designId: DesignId,
  contentDebug = false,
) {
  const url = new URL(path, "https://portfolio.test");

  if (designId === presentationJson.defaultHomeTemplate) {
    url.searchParams.delete("view");
  } else {
    url.searchParams.set("view", designId);
  }

  if (contentDebug) {
    url.searchParams.set("debug", "content");
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

function expectedActiveDesignNavigationHref(path: string, designId: DesignId) {
  return expectedInternalHref(path, designId);
}

async function expectDesignRoute(
  page: Page,
  path: string,
  designId: DesignId,
) {
  const response = await page.goto(withExplicitDesign(path, designId));

  expect(response?.ok()).toBe(true);
  await expect(
    page.locator(`[data-site-design="${designId}"]`),
  ).toBeVisible();
  await expect(page.locator("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  const activeLabel = templateLabels.get(designId);

  if (!activeLabel) {
    throw new Error(`Missing presentation copy for ${designId}.`);
  }

  await expect(
    page.getByLabel(
      presentationJson.ui.designSwitcherAriaTemplate.replace(
        "{label}",
        activeLabel,
      ),
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
}

async function expectExactContent(page: Page, value: string) {
  await expect(
    page.locator("main").getByText(value, { exact: true }).first(),
  ).toBeVisible();
}

async function expectContainedContent(page: Page, value: string) {
  await expect(
    page.locator("main").getByText(value, { exact: false }).first(),
  ).toBeVisible();
}

async function expectMinimumTouchTargets(locator: Locator) {
  const bounds = await locator.evaluateAll((elements) =>
    elements.map((element) => {
      const rectangle = element.getBoundingClientRect();
      return { height: rectangle.height, width: rectangle.width };
    }),
  );

  expect(bounds.length).toBeGreaterThan(0);
  for (const target of bounds) {
    expect(target.height).toBeGreaterThanOrEqual(44);
    expect(target.width).toBeGreaterThanOrEqual(44);
  }
}

async function expectSharedRouteEvidence(page: Page, path: string) {
  if (path === "/") {
    await expectExactContent(page, profileJson.headline);
    await expectExactContent(page, firstProject.title);
    return;
  }

  if (path === "/projects") {
    await expectExactContent(page, firstProject.title);
    const firstGroup = projectsJson.groups.find(
      (group) => group.id === firstProject.groupId,
    );
    if (firstGroup) {
      await expectContainedContent(page, firstGroup.label);
    }
    return;
  }

  if (path.startsWith("/projects/")) {
    await expectExactContent(page, firstProject.title);
    await expectContainedContent(page, firstProjectTechnology.label);
    await expectExactContent(page, firstProject.highlights[0]);

    const projectImage = page.locator("main img").first();
    await expect(projectImage).toBeVisible();
    expect(
      await projectImage.evaluate((image) => {
        const element = image as HTMLImageElement;
        const bounds = element.getBoundingClientRect();

        return (
          element.complete &&
          element.naturalWidth > 0 &&
          element.naturalHeight > 0 &&
          bounds.width > 0 &&
          bounds.height > 0
        );
      }),
    ).toBe(true);
    return;
  }

  if (path === "/about") {
    await expectExactContent(page, skillsJson.focusAreas[0].title);
    await expectExactContent(page, experienceJson[0].title);
    await expect(
      page.locator("main").getByAltText(profileJson.photo.alt),
    ).toBeVisible();

    if (siteJson.pages.curation) {
      await expectExactContent(page, curationJson.nextReview.title);
    }
    return;
  }

  if (path === "/resume") {
    await expectContainedContent(page, profileJson.availability);
    await expectContainedContent(page, resumeJson.summary[0]);
    await expectExactContent(page, resumeJson.notes[0]);
    await expectExactContent(page, firstResumeProject.title);
    await expectExactContent(page, resumeJson.training[0].name);
    await expectExactContent(page, experienceJson[0].title);
    return;
  }

  if (path === "/contact") {
    await expectExactContent(page, contactJson.availability);
    await expectExactContent(page, contactJson.notes[0]);
    const firstPreferredLink = contactJson.preferred[0];
    const firstPreferredLinkLabel = linksJson.find(
      (link) => link.id === firstPreferredLink,
    )?.label;
    if (firstPreferredLinkLabel) {
      await expectContainedContent(page, firstPreferredLinkLabel);
    }
    return;
  }

  if (path === "/journey") {
    await expectExactContent(page, journeyNarrativeJson.milestones[0].title);
    await expectContainedContent(page, journeyNarrativeJson.milestones[0].state);
    await expectExactContent(page, journeyNarrativeJson.currentPosition.title);
    await expectExactContent(page, journeyNarrativeJson.currentPosition.body);
    return;
  }

  if (path === "/interview-map") {
    await expectContainedContent(page, interviewMapJson.referenceRepo.label);
    await expectContainedContent(page, interviewMapJson.tracks[0].items[0].label);
    await expectContainedContent(page, firstInterviewProject.title);
    await expectExactContent(page, interviewMapJson.gaps.items[0]);
  }
}

for (const designId of designIds) {
  test(`${designId}: renders every enabled route on shared content`, async ({
    page,
  }) => {
    test.slow();

    for (const { path } of enabledRoutes) {
      await expectDesignRoute(page, path, designId);
      await expectSharedRouteEvidence(page, path);
    }
  });

}

test("design switching preserves the current route and content debug query", async ({
  page,
}) => {
  test.slow();
  const hydrationErrors: string[] = [];

  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|server rendered HTML|did not match/i.test(message.text())
    ) {
      hydrationErrors.push(message.text());
    }
  });

  for (const [index, sourceDesign] of designIds.entries()) {
    const targetDesign = designIds[(index + 1) % designIds.length];
    await expectDesignRoute(
      page,
      "/projects?debug=content",
      sourceDesign,
    );

    await page
      .locator('summary[aria-label^="Change site design"]')
      .click();
    const designNavigation = page.getByRole("navigation", {
      name: "Site design",
    });
    await expect(designNavigation).toBeVisible();

    const expectedHref = expectedInternalHref(
      "/projects",
      targetDesign,
      true,
    );
    await designNavigation.locator(`a[href="${expectedHref}"]`).click();

    await expect(page).toHaveURL(
      new RegExp(`${expectedHref.replace(/[?&]/g, "\\$&")}$`),
    );
    await expect(
      page.locator(`[data-site-design="${targetDesign}"]`),
    ).toBeVisible();
  }

  expect(hydrationErrors).toEqual([]);
});

test("an invalid design query falls back to editorial", async ({ page }) => {
  const response = await page.goto("/?view=not-a-design");

  expect(response?.ok()).toBe(true);
  await expect(page.locator('[data-site-design="editorial"]')).toBeVisible();
  await expect(
    page.getByLabel(
      presentationJson.ui.designSwitcherAriaTemplate.replace(
        "{label}",
        templateLabels.get("editorial") ?? "editorial",
      ),
    ),
  ).toBeVisible();
});

test("reduced motion disables sustained presentation animation", async ({
  page,
}) => {
  test.slow();
  await page.emulateMedia({ reducedMotion: "reduce" });

  for (const designId of designIds) {
    await expectDesignRoute(page, "/", designId);
    const motionState = await page.evaluate(() => {
      const durationToMilliseconds = (value: string) => {
        const numeric = Number.parseFloat(value);
        return value.trim().endsWith("ms") ? numeric : numeric * 1000;
      };

      let maximumDuration = 0;
      let hasInfiniteAnimation = false;

      for (const element of document.querySelectorAll("*")) {
        for (const pseudoElement of [null, "::before", "::after"] as const) {
          const style = getComputedStyle(element, pseudoElement);
          const durations = [
            ...style.animationDuration.split(","),
            ...style.transitionDuration.split(","),
          ].map(durationToMilliseconds);
          maximumDuration = Math.max(maximumDuration, ...durations);
          hasInfiniteAnimation ||= style.animationIterationCount
            .split(",")
            .some((count) => count.trim() === "infinite");
        }
      }

      return {
        hasInfiniteAnimation,
        maximumDuration,
        runningInfiniteAnimations: document
          .getAnimations()
          .some(
            (animation) =>
              animation.playState === "running" &&
              animation.effect?.getTiming().iterations === Infinity,
          ),
        scrollBehavior: getComputedStyle(document.documentElement)
          .scrollBehavior,
      };
    });

    expect(motionState.maximumDuration).toBeLessThanOrEqual(1);
    expect(motionState.hasInfiniteAnimation).toBe(false);
    expect(motionState.runningInfiniteAnimations).toBe(false);
    expect(motionState.scrollBehavior).toBe("auto");
  }
});

test("mobile navigation reaches projects without losing the active design", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"));
  test.slow();

  for (const designId of designIds) {
    await expectDesignRoute(page, "/", designId);
    const mobileNavigation = page.locator(
      `nav[aria-label="${presentationJson.ui.mobileNavigationAriaLabel}"]`,
    );
    const menu = page
      .locator("details")
      .filter({ has: mobileNavigation })
      .locator(":scope > summary");
    const switcher = page.getByLabel(
      presentationJson.ui.designSwitcherAriaTemplate.replace(
        "{label}",
        templateLabels.get(designId) ?? designId,
      ),
    );

    await expect(menu).toBeVisible();
    await expect(switcher).toBeVisible();
    await expectMinimumTouchTargets(menu);
    await expectMinimumTouchTargets(switcher);

    await switcher.click();
    const designNavigation = page.getByRole("navigation", {
      name: presentationJson.ui.designNavigationAriaLabel,
    });
    await expect(designNavigation).toBeVisible();
    await expectMinimumTouchTargets(designNavigation.getByRole("link"));
    const closeDesignSheet = designNavigation.getByRole("button", {
      name: presentationJson.ui.designSwitcherCloseLabel,
    });
    await expect(closeDesignSheet).toBeVisible();
    await expectMinimumTouchTargets(closeDesignSheet);
    const sheetBounds = await designNavigation.boundingBox();
    expect(sheetBounds).not.toBeNull();
    const sheetPosition = await page.evaluate(
      ({ bottom, left, right }) => ({
        bottomGap: Math.abs(window.innerHeight - bottom),
        left,
        rightOverflow: Math.max(0, right - window.innerWidth),
      }),
      {
        bottom: (sheetBounds?.y ?? 0) + (sheetBounds?.height ?? 0),
        left: sheetBounds?.x ?? 0,
        right: (sheetBounds?.x ?? 0) + (sheetBounds?.width ?? 0),
      },
    );
    expect(sheetPosition.bottomGap).toBeLessThanOrEqual(2);
    expect(sheetPosition.left).toBeGreaterThanOrEqual(0);
    expect(sheetPosition.rightOverflow).toBeLessThanOrEqual(1);
    await closeDesignSheet.click();
    await expect(designNavigation).toBeHidden();
    await expect(switcher).toBeFocused();

    await menu.click();
    await expect(mobileNavigation).toBeVisible();
    const expectedHref = expectedActiveDesignNavigationHref(
      "/projects",
      designId,
    );
    const projectsLink = mobileNavigation
      .locator(`a[href="${expectedHref}"]`)
      .first();

    await expect(projectsLink).toBeVisible();
    await expect(projectsLink).toContainText(projectsNavigation.label);
    await expectMinimumTouchTargets(mobileNavigation.getByRole("link"));
    await menu.focus();
    await page.keyboard.press("Tab");
    const firstMobileLink = mobileNavigation.getByRole("link").first();
    await expect(firstMobileLink).toBeFocused();
    expect(
      await firstMobileLink.evaluate((element) => {
        const style = getComputedStyle(element);
        return (
          style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0
        ) || style.boxShadow !== "none";
      }),
    ).toBe(true);
    await projectsLink.click();
    await expect(page).toHaveURL(
      new RegExp(`${expectedHref.replace(/[?&]/g, "\\$&")}$`),
    );
    await expect(
      page.locator(`[data-site-design="${designId}"]`),
    ).toBeVisible();
  }
});
