import type { ComponentType, ReactElement } from "react";
import type { SiteDesignId } from "@/lib/portfolio";
import type { DesignRouteProps, DesignRouteRequestProps } from "./types";

type DesignModule = {
  default: ComponentType<DesignRouteProps>;
};

const routeLoaders: Partial<Record<SiteDesignId, () => Promise<DesignModule>>> = {
  editorial: () => import("./editorial"),
  brutalist: () => import("./brutalist"),
  cinematic: () => import("./cinematic"),
};

export function hasDedicatedRouteRenderer(
  designId: SiteDesignId,
): designId is "editorial" | "brutalist" | "cinematic" {
  return designId in routeLoaders;
}

export async function renderDesignRoute(
  designId: SiteDesignId,
  props: DesignRouteRequestProps,
): Promise<ReactElement | null> {
  const loader = routeLoaders[designId];

  if (!loader) return null;

  const { default: Renderer } = await loader();
  const rendererProps: DesignRouteProps =
    "viewModel" in props
      ? {
          content: props.viewModel,
          contentDebug: props.contentDebug,
          currentPath: props.currentPath,
          project:
            props.viewModel.route === "project-detail"
              ? props.viewModel.project
              : undefined,
          route: props.route,
        }
      : props;

  return <Renderer {...rendererProps} />;
}
