import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { getFeaturedProjects, getPortfolioContent } from "@/lib/portfolio";

import Home from "./page";

const content = getPortfolioContent();
const designIds = [
  "design",
  "classic",
  "editorial",
  "brutalist",
  "cinematic",
] as const;

afterEach(() => cleanup());

describe("Home", () => {
  it("renders the same journey evidence in the two original presentations", async () => {
    const journeyTitles = content.journey.map((item) => item.title);

    render(
      await Home({
        searchParams: Promise.resolve({ view: "design" }),
      }),
    );

    for (const title of journeyTitles) {
      expect(screen.getAllByText(title, { exact: true }).length).toBeGreaterThan(
        0,
      );
    }

    cleanup();
    render(
      await Home({
        searchParams: Promise.resolve({ view: "classic" }),
      }),
    );

    for (const title of journeyTitles) {
      expect(screen.getAllByText(title, { exact: true }).length).toBeGreaterThan(
        0,
      );
    }
  });

  it("uses editorial when no design is requested", async () => {
    const { container } = render(await Home({}));

    expect(
      container.querySelector('[data-site-design="editorial"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        "Change site design. Current design: Editorial",
      ),
    ).toHaveTextContent("Design 03/05");
  });

  it.each(designIds)(
    "renders shared content through the %s full-site design",
    async (designId) => {
      const { container } = render(
        await Home({
          searchParams: Promise.resolve({ view: designId }),
        }),
      );
      const design = content.presentation.templates.find(
        (template) => template.id === designId,
      );
      const root = container.querySelector(
        `[data-site-design="${designId}"]`,
      );
      const featuredProject = getFeaturedProjects(content)[0] ?? content.projects[0];
      const projectsNavItem = content.site.navigation.find(
        (item) => item.href === "/projects",
      );
      const expectedProjectsHref =
        designId === "editorial" ? "/projects" : `/projects?view=${designId}`;

      expect(design).toBeDefined();
      expect(root).toBeInTheDocument();
      expect(
        screen.getAllByRole("heading", { level: 1 })[0],
      ).toHaveTextContent(/\S/);
      expect(
        screen.getByLabelText(
          `Change site design. Current design: ${design?.label}`,
        ),
      ).toBeInTheDocument();

      if (featuredProject) {
        expect(
          screen.getAllByText(featuredProject.title, { exact: true }).length,
        ).toBeGreaterThan(0);
      }

      expect(projectsNavItem).toBeDefined();
      const projectLinks = Array.from(root?.querySelectorAll("a") ?? []);
      expect(
        projectLinks.some(
          (link) => link.getAttribute("href") === expectedProjectsHref,
        ),
      ).toBe(true);

      const designNavigation = screen.getByRole("navigation", {
        hidden: true,
        name: "Site design",
      });
      expect(
        within(designNavigation).getAllByRole("link", { hidden: true }),
      ).toHaveLength(designIds.length);
    },
  );

  it("falls back to editorial for an unknown design", async () => {
    const { container } = render(
      await Home({
        searchParams: Promise.resolve({ view: "not-a-design" }),
      }),
    );

    expect(
      container.querySelector('[data-site-design="editorial"]'),
    ).toBeInTheDocument();
  });

  it("preserves content debug state across navigation and design changes", async () => {
    render(
      await Home({
        searchParams: Promise.resolve({
          debug: "content",
          view: "brutalist",
        }),
      }),
    );

    const designNavigation = screen.getByRole("navigation", {
      hidden: true,
      name: "Site design",
    });
    const editorialLink = within(designNavigation).getByRole("link", {
      hidden: true,
      name: /Editorial/,
    });
    const cinematicLink = within(designNavigation).getByRole("link", {
      hidden: true,
      name: /Cinematic/,
    });
    const brutalistRoot = document.querySelector(
      '[data-site-design="brutalist"]',
    );

    expect(editorialLink).toHaveAttribute("href", "/?debug=content");
    expect(cinematicLink).toHaveAttribute(
      "href",
      "/?view=cinematic&debug=content",
    );
    expect(
      Array.from(brutalistRoot?.querySelectorAll("a") ?? [])
        .some(
          (link) =>
            link.getAttribute("href") ===
            "/projects?view=brutalist&debug=content",
        ),
    ).toBe(true);
  });
});
