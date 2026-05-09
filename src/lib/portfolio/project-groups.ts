import type { PortfolioProject, ProjectPageContent } from "./types";

export type GroupedProjects = [string, PortfolioProject[]][];

export function groupProjects(
  projects: PortfolioProject[],
  groups: ProjectPageContent["groups"],
): GroupedProjects {
  const grouped = new Map<string, PortfolioProject[]>();
  const groupOrder = groups.map((group) => group.category);

  for (const project of projects) {
    grouped.set(project.category, [...(grouped.get(project.category) ?? []), project]);
  }

  return [...grouped.entries()].sort(([left], [right]) => {
    const leftIndex = groupOrder.indexOf(left);
    const rightIndex = groupOrder.indexOf(right);

    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right);
    }

    if (leftIndex === -1) {
      return 1;
    }

    if (rightIndex === -1) {
      return -1;
    }

    return leftIndex - rightIndex;
  });
}
