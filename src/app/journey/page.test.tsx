import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { getPortfolioContent } from "@/lib/portfolio";

import JourneyPage from "./page";

afterEach(() => cleanup());

describe("JourneyPage", () => {
  it("uses content-owned shell and milestone labels", async () => {
    const content = getPortfolioContent();
    const ui = content.presentation.ui;
    const labels = content.presentation.pages.journey.narrative.labels;

    render(
      await JourneyPage({
        searchParams: Promise.resolve({ view: "design" }),
      }),
    );

    expect(screen.getByText(ui.skipLinkLabel, { exact: true })).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", {
        name: ui.primaryNavigationAriaLabel,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", {
        hidden: true,
        name: ui.mobileNavigationAriaLabel,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(ui.menuLabel, { exact: true })).toBeInTheDocument();

    for (const label of [labels.state, labels.reason, labels.result]) {
      expect(screen.getAllByText(label, { exact: true }).length).toBeGreaterThan(0);
    }
  });
});
