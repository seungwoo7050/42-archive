import type { ComponentType, ReactElement } from "react";
import type { SiteDesignId } from "@/lib/portfolio";
import type { DesignRouteProps } from "./types";

type DesignModule = {
  default: ComponentType<DesignRouteProps>;
};

const routeLoaders: Partial<Record<SiteDesignId, () => Promise<DesignModule>>> = {
  editorial: () => import("./editorial"),
  brutalist: () => import("./brutalist"),
};

export function hasDedicatedRouteRenderer(
  designId: SiteDesignId,
): designId is "editorial" | "brutalist" | "cinematic" {
  return designId in routeLoaders;
}

export async function renderDesignRoute(
  designId: SiteDesignId,
  props: DesignRouteProps,
): Promise<ReactElement | null> {
  const loader = routeLoaders[designId];

  if (!loader) return null;

  const { default: Renderer } = await loader();
  return <Renderer {...props} />;
}
