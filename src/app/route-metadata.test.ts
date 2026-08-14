import { describe, expect, it } from "vitest";

import { getPortfolioContent } from "@/lib/portfolio";

import { generateMetadata as getAboutMetadata } from "./about/page";
import { generateMetadata as getContactMetadata } from "./contact/page";
import { generateMetadata as getInterviewMapMetadata } from "./interview-map/page";
import { generateMetadata as getJourneyMetadata } from "./journey/page";
import { generateMetadata as getHomeMetadata } from "./page";
import { generateMetadata as getProjectMetadata } from "./projects/[projectId]/page";
import { generateMetadata as getProjectsMetadata } from "./projects/page";
import { generateMetadata as getResumeMetadata } from "./resume/page";

const content = getPortfolioContent();
const project = content.projects[0];

if (!project) {
  throw new Error("Route metadata tests require at least one enabled project.");
}

describe("route metadata exports", () => {
  it.each([
    ["/", content.site.title, getHomeMetadata],
    [
      "/projects",
      content.presentation.pages.projects.design.hero.title,
      getProjectsMetadata,
    ],
    ["/about", content.presentation.pages.about.hero.title, getAboutMetadata],
    ["/resume", content.presentation.pages.resume.hero.title, getResumeMetadata],
    ["/contact", content.contact.title, getContactMetadata],
    ["/journey", content.presentation.pages.journey.hero.title, getJourneyMetadata],
    [
      "/interview-map",
      content.presentation.pages.interviewMap.hero.title,
      getInterviewMapMetadata,
    ],
  ])("provides content metadata for %s", async (path, title, getMetadata) => {
    const metadata = await getMetadata();

    expect(metadata.alternates).toEqual({ canonical: path });
    expect(String(metadata.title)).toContain(title);
    expect(metadata.description).toBeTruthy();
  });

  it("uses project content for project detail metadata", async () => {
    const metadata = await getProjectMetadata({
      params: Promise.resolve({ projectId: project.id }),
    });

    expect(metadata.alternates).toEqual({
      canonical: `/projects/${project.id}`,
    });
    expect(metadata.title).toBe(`${project.title} | ${content.site.brand}`);
    expect(metadata.description).toBe(project.summary);
  });
});
