import type { PortfolioProject } from "@/lib/portfolio";
import { isProjectLive } from "@/lib/portfolio";

const statusTone: Record<string, string> = {
  archived: "border-line bg-surface-soft text-muted",
  "case-study-only": "border-line bg-surface-soft text-muted",
  live: "border-accent/45 bg-accent-soft text-accent-strong",
  offline: "border-line bg-surface-soft text-muted",
  private: "border-line bg-surface-soft text-muted",
  "source-only": "border-line bg-surface-soft text-muted",
};

export function AvailabilityBadge({ project }: { project: PortfolioProject }) {
  if (!project.deployment.showBadge) {
    return null;
  }

  const live = isProjectLive(project);
  const tone = statusTone[project.deployment.status] ?? statusTone["source-only"];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold ${tone}`}
    >
      {live ? (
        <span className="h-1.5 w-1.5 rounded-full bg-accent-strong" />
      ) : null}
      {project.deployment.label}
    </span>
  );
}
