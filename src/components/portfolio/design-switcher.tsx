"use client";

import Link from "next/link";
import { useRef } from "react";
import { SITE_DESIGNS } from "@/designs/config";
import {
  getTemplateHref,
  type PresentationContent,
  type PresentationTemplate,
  type SiteDesignId,
} from "@/lib/portfolio";
import styles from "./design-switcher.module.css";

export function DesignSwitcher({
  activeId,
  contentDebug,
  currentPath,
  templates,
  ui,
}: {
  activeId: SiteDesignId;
  contentDebug?: boolean;
  currentPath: string;
  templates: PresentationTemplate[];
  ui: PresentationContent["ui"];
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const templateCopy = new Map(
    templates.map((template) => [template.id, template]),
  );
  const activeIndex = SITE_DESIGNS.findIndex((design) => design.id === activeId);
  const active = SITE_DESIGNS[activeIndex] ?? SITE_DESIGNS[0];
  const activeCopy = templateCopy.get(active.id);
  const activeLabel = activeCopy?.label ?? active.id;
  const countLabel = ui.designSwitcherCountTemplate
    .replace("{index}", String(activeIndex + 1).padStart(2, "0"))
    .replace("{total}", String(SITE_DESIGNS.length).padStart(2, "0"));

  return (
    <details className={styles.root} ref={detailsRef}>
      <summary
        aria-label={ui.designSwitcherAriaTemplate.replace(
          "{label}",
          activeLabel,
        )}
        ref={summaryRef}
      >
        <span className={styles.count}>{countLabel}</span>
        <span className={styles.label}>{activeLabel}</span>
      </summary>
    </details>
  );
}
