import type { ComponentType, ReactElement } from "react";
import type { SiteDesignId } from "@/lib/portfolio";
import type { DesignRouteProps, DesignRouteRequestProps } from "./types";

type DesignModule = {
  default: ComponentType<DesignRouteProps>;
};

const routeLoaders: Record<SiteDesignId, () => Promise<DesignModule>> = {
  design: () => import("./design"),
  classic: () => import("./classic"),
  editorial: () => import("./editorial"),
  brutalist: () => import("./brutalist"),
  cinematic: () => import("./cinematic"),
};

export async function renderDesignRoute(
  designId: SiteDesignId,
  props: DesignRouteRequestProps,
): Promise<ReactElement | null> {
  const loader = routeLoaders[designId];

  const { default: Renderer } = await loader();
  const rendererProps: DesignRouteProps = {
    content: props.viewModel,
    contentDebug: props.contentDebug,
    currentPath: props.currentPath,
    project:
      props.viewModel.route === "project-detail"
        ? props.viewModel.project
        : undefined,
    route: props.route,
  };

  return <Renderer {...rendererProps} />;
}
