import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PortfolioProject } from "@/lib/portfolio";

import { ProjectCardLinks, ProjectLinks } from "./project-links";

const project: PortfolioProject = {
  id: "sample-project",
  order: "999",
  title: "Sample Project",
  groupId: "featured",
  tags: ["sample"],
  category: "Web App",
  period: "2026",
  role: "Developer",
  summary: "Summary",
  description: "Description",
  deployment: {
    label: "Live",
    status: "live",
  },
  screenshot: {
    alt: "Sample project",
    src: "/content/projects/sample.svg",
  },
  screenshots: [],
  stack: [],
  links: [
    {
      href: "/projects/sample-project",
      label: "Case Study",
      placements: ["card", "detail"],
      type: "case-study",
    },
    {
      external: true,
      href: "https://github.com/example/sample",
      label: "GitHub",
      placements: ["card", "detail"],
      type: "github",
    },
    {
      external: true,
      href: "https://example.com/demo",
      label: "Live Demo",
      placements: ["card", "detail"],
      type: "demo",
    },
    {
      external: true,
      href: "https://example.com/source",
      label: "Source",
      placements: ["detail"],
      type: "source",
    },
  ],
  highlights: [],
  problem: "Problem",
  solution: "Solution",
  architecture: {
    items: [],
    summary: "Architecture",
  },
  decisions: [],
  tradeoffs: [],
  results: [],
};

describe("project links", () => {
  it("renders detail links in source order", () => {
    render(
      <ProjectLinks
        contentDebug
        homeTemplate="classic"
        project={project}
      />,
    );

    const links = screen.getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual([
      "Case Study",
      "GitHub",
      "Live Demo",
      "Source",
    ]);
    expect(links[0]).toHaveAttribute(
      "href",
      "/projects/sample-project?view=classic&debug=content",
    );
    expect(links[0]).not.toHaveAttribute("target");
    expect(links[1]).toHaveAttribute("target", "_blank");
    expect(links[1]).toHaveAttribute("rel", "noreferrer");
  });

  it("applies detail filtering without hiding source links", () => {
    render(
      <ProjectLinks
        excludeCaseStudy
        project={{
          ...project,
          deployment: { label: "Offline", status: "offline" },
        }}
      />,
    );

    expect(
      screen.queryByRole("link", { name: "Case Study" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Live Demo" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "GitHub",
      "Source",
    ]);
  });

  it("limits card links to their declared placement", () => {
    render(<ProjectCardLinks project={project} />);

    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Case Study",
      "GitHub",
      "Live Demo",
    ]);
    expect(
      screen.queryByRole("link", { name: "Source" }),
    ).not.toBeInTheDocument();
  });

  it("renders no wrapper when filtering leaves no links", () => {
    const { container, rerender } = render(
      <ProjectCardLinks
        project={{
          ...project,
          links: [project.links[3]],
        }}
      />,
    );

    expect(container).toBeEmptyDOMElement();

    rerender(
      <ProjectLinks
        excludeCaseStudy
        project={{
          ...project,
          links: [project.links[0]],
        }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
