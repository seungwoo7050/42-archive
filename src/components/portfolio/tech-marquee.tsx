import type { CSSProperties } from "react";
import type { TechStackItem } from "@/lib/portfolio";
import { TechIcon } from "./tech-icon";

export function TechMarquee({ items }: { items: TechStackItem[] }) {
  const visibleItems = items.slice(0, 18);

  return (
    <div aria-label="Technology stack marquee" className="stack-marquee">
      <div className="stack-marquee-viewport">
        <TechMarqueeTrack items={visibleItems} />
        <TechMarqueeTrack ariaHidden items={visibleItems} />
      </div>
    </div>
  );
}

function TechMarqueeTrack({
  ariaHidden = false,
  items,
}: {
  ariaHidden?: boolean;
  items: TechStackItem[];
}) {
  return (
    <ul aria-hidden={ariaHidden} className="stack-marquee-track">
      {items.map((item) => (
        <li
          className="stack-marquee-card"
          key={`${ariaHidden ? "ghost" : "live"}-${item.id}`}
          style={{ "--stack-color": item.color } as CSSProperties}
        >
          <span className="stack-marquee-icon">
            <TechIcon color={item.color} icon={item.icon} />
          </span>
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
