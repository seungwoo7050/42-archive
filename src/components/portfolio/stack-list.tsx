import type { CSSProperties } from "react";
import { resolveTechStackItem } from "@/lib/portfolio";
import { TechIcon } from "./tech-icon";

export function StackList({
  items,
  limit,
}: {
  items: string[];
  limit?: number;
}) {
  const visibleItems = typeof limit === "number" ? items.slice(0, limit) : items;

  return (
    <ul className="flex flex-wrap gap-2">
      {visibleItems.map((item) => {
        const stack = resolveTechStackItem(item);

        return (
          <li
            className="tech-chip group/stack inline-flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1.5 text-[0.72rem] font-medium text-muted transition duration-200 hover:-translate-y-0.5 hover:border-accent/55 hover:bg-surface-hover hover:text-foreground"
            key={item}
            style={{ "--stack-color": stack.color } as CSSProperties}
          >
            <span className="text-[var(--stack-color)] opacity-75 transition duration-200 group-hover/stack:opacity-100">
              <TechIcon color={stack.color} icon={stack.icon} />
            </span>
            {stack.label}
          </li>
        );
      })}
    </ul>
  );
}
