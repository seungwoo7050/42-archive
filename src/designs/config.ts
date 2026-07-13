import type { SiteDesignId } from "@/lib/portfolio";

export type SiteDesignDefinition = {
  id: SiteDesignId;
  swatch: [string, string, string];
};

export const SITE_DESIGNS: SiteDesignDefinition[] = [
  {
    id: "design",
    swatch: ["#f7faf8", "#008c89", "#4f46e5"],
  },
  {
    id: "classic",
    swatch: ["#1f2023", "#9cc8b1", "#7aa7ff"],
  },
  {
    id: "editorial",
    swatch: ["#f2ebdd", "#171614", "#d64b32"],
  },
  {
    id: "brutalist",
    swatch: ["#f4f0e8", "#2e5bff", "#e6ff3f"],
  },
  {
    id: "cinematic",
    swatch: ["#0a0b0e", "#d9d2c4", "#c98a4a"],
  },
];

export const SITE_DESIGN_IDS = SITE_DESIGNS.map((design) => design.id);

export function getSiteDesignDefinition(id: SiteDesignId) {
  return SITE_DESIGNS.find((design) => design.id === id) ?? SITE_DESIGNS[0];
}
