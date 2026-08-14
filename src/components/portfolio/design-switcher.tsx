import Link from "next/link";
import { SITE_DESIGNS } from "@/designs/config";
import { createTemplateHref } from "@/lib/portfolio/template-href";
import type {
  PresentationContent,
  PresentationTemplate,
  SiteDesignId,
} from "@/lib/portfolio/types";
import { DesignSwitcherClose } from "./design-switcher-close";
import styles from "./design-switcher.module.css";

export function DesignSwitcher({
  activeId,
  contentDebug,
  currentPath,
  defaultId,
  templates,
  ui,
}: {
  activeId: SiteDesignId;
  contentDebug?: boolean;
  currentPath: string;
  defaultId: SiteDesignId;
  templates: PresentationTemplate[];
  ui: PresentationContent["ui"];
}) {
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
    <details className={styles.root} suppressHydrationWarning>
      <summary
        aria-label={ui.designSwitcherAriaTemplate.replace(
          "{label}",
          activeLabel,
        )}
      >
        <span className={styles.count}>{countLabel}</span>
        <span className={styles.label}>{activeLabel}</span>
      </summary>
      <nav aria-label={ui.designNavigationAriaLabel} className={styles.panel}>
        <div className={styles.sheetHeader}>
          <strong>{ui.designNavigationAriaLabel}</strong>
          <DesignSwitcherClose label={ui.designSwitcherCloseLabel} />
        </div>
        <ul className={styles.list}>
          {SITE_DESIGNS.map((design, index) => {
            const copy = templateCopy.get(design.id);
            const isActive = design.id === activeId;

            return (
              <li key={design.id}>
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={`${styles.link} ${isActive ? styles.active : ""}`}
                  href={createTemplateHref(
                    currentPath,
                    design.id,
                    defaultId,
                    { contentDebug },
                  )}
                  prefetch={false}
                >
                  <span aria-hidden="true" className={styles.swatch}>
                    {design.swatch.map((color) => (
                      <span key={color} style={{ background: color }} />
                    ))}
                  </span>
                  <span className={styles.copy}>
                    <strong>{copy?.label ?? design.id}</strong>
                    <small>{copy?.description}</small>
                  </span>
                  <span className={styles.number}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </details>
  );
}
