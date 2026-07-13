import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { getPortfolioContent } from "@/lib/portfolio";

import AboutPage from "./about/page";
import ContactPage from "./contact/page";
import InterviewMapPage from "./interview-map/page";
import JourneyPage from "./journey/page";
import Home from "./page";
import ProjectDetailPage from "./projects/[projectId]/page";
import ProjectsPage from "./projects/page";
import ResumePage from "./resume/page";

afterEach(() => cleanup());

const content = getPortfolioContent();
const firstProject = content.projects[0];

if (!firstProject) {
  throw new Error("Route characterization requires at least one enabled project.");
}

const routes = [
  {
    currentPath: "/",
    heading: content.profile.role,
    renderPage: () =>
      Home({
        searchParams: Promise.resolve({ debug: "content", view: "classic" }),
      }),
  },
  {
    currentPath: "/about",
    heading: "About",
    renderPage: () =>
      AboutPage({
        searchParams: Promise.resolve({ debug: "content", view: "classic" }),
      }),
  },
  {
    currentPath: "/contact",
    heading: "Contact",
    renderPage: () =>
      ContactPage({
        searchParams: Promise.resolve({ debug: "content", view: "classic" }),
      }),
  },
  {
    currentPath: "/interview-map",
    heading: "Interview Map",
    renderPage: () =>
      InterviewMapPage({
        searchParams: Promise.resolve({ debug: "content", view: "classic" }),
      }),
  },
  {
    currentPath: "/journey",
    heading: "Journey",
    renderPage: () =>
      JourneyPage({
        searchParams: Promise.resolve({ debug: "content", view: "classic" }),
      }),
  },
  {
    currentPath: "/projects",
    heading: "Project archive",
    renderPage: () =>
      ProjectsPage({
        searchParams: Promise.resolve({ debug: "content", view: "classic" }),
      }),
  },
  {
    currentPath: `/projects/${firstProject.id}`,
    heading: firstProject.title,
    renderPage: () =>
      ProjectDetailPage({
        params: Promise.resolve({ projectId: firstProject.id }),
        searchParams: Promise.resolve({ debug: "content", view: "classic" }),
      }),
  },
  {
    currentPath: "/resume",
    heading: "Resume",
    renderPage: () =>
      ResumePage({
        searchParams: Promise.resolve({ debug: "content", view: "classic" }),
      }),
  },
];

describe("portfolio routes", () => {
  it.each(routes)(
    "preserves the classic shell contract for $currentPath",
    async ({ currentPath, heading, renderPage }) => {
      const { container } = render(await renderPage());

      expect(
        screen.getByRole("heading", { level: 1, name: heading }),
      ).toBeInTheDocument();
      expect(container.querySelector("main")).toHaveAttribute(
        "data-home-template",
        "classic",
      );
      expect(
        screen.getAllByLabelText(/^Content source:/).length,
      ).toBeGreaterThan(0);
      expect(
        screen.getAllByRole("link", { name: "Projects" })[0],
      ).toHaveAttribute("href", "/projects?view=classic&debug=content");

      const designNavigation = screen.getByRole("navigation", {
        hidden: true,
        name: "Site design",
      });
      expect(
        within(designNavigation).getByRole("link", {
          hidden: true,
          name: /Classic/,
        }),
      ).toHaveAttribute("aria-current", "page");
      expect(
        within(designNavigation).getByRole("link", {
          hidden: true,
          name: /Design/,
        }),
      ).toHaveAttribute(
        "href",
        `${currentPath}?view=design&debug=content`,
      );
    },
  );

  it("uses the first value from repeated view and debug queries", async () => {
    const { container } = render(
      await AboutPage({
        searchParams: Promise.resolve({
          debug: ["content", "off"],
          view: ["classic", "editorial"],
        }),
      }),
    );

    expect(container.querySelector("main")).toHaveAttribute(
      "data-home-template",
      "classic",
    );
    expect(screen.getAllByLabelText(/^Content source:/).length).toBeGreaterThan(
      0,
    );
  });
});
