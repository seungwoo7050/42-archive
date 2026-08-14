import projectsJson from "../../src/content/projects.json";
import siteJson from "../../src/content/site.json";

export const designIds = [
  "design",
  "classic",
  "editorial",
  "brutalist",
  "cinematic",
] as const;

export type DesignId = (typeof designIds)[number];

export const firstEnabledProject = projectsJson.items.find(
  (project) => project.enabled !== false,
);

if (!firstEnabledProject) {
  throw new Error("The portfolio needs at least one enabled project.");
}

const routeDefinitions = [
  { path: "/", pageId: undefined },
  { path: "/projects", pageId: "projects" },
  { path: `/projects/${firstEnabledProject.id}`, pageId: "projects" },
  { path: "/about", pageId: "about" },
  { path: "/resume", pageId: "resume" },
  { path: "/contact", pageId: "contact" },
  { path: "/journey", pageId: "journey" },
  { path: "/interview-map", pageId: "interviewMap" },
] as const;

export const enabledRoutes = routeDefinitions.filter(
  ({ pageId }) => !pageId || siteJson.pages?.[pageId] !== false,
);

export function withExplicitDesign(path: string, designId: DesignId) {
  const url = new URL(path, "https://portfolio.test");
  url.searchParams.set("view", designId);
  return `${url.pathname}${url.search}${url.hash}`;
}
