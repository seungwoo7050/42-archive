import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { getPortfolioContent } from "@/lib/portfolio";

import { DesignSwitcher } from "./design-switcher";

afterEach(() => cleanup());

describe("DesignSwitcher", () => {
  it("renders selector copy from content and clears native open state", () => {
    const content = getPortfolioContent();
    const ui = {
      ...content.presentation.ui,
      designSwitcherAriaTemplate: "Choose presentation: {label}",
      designSwitcherCountTemplate: "View {index} of {total}",
      designNavigationAriaLabel: "Presentation choices",
    };

    render(
      <DesignSwitcher
        activeId="editorial"
        contentDebug
        currentPath="/projects"
        templates={content.presentation.templates}
        ui={ui}
      />,
    );

    const summary = screen.getByLabelText("Choose presentation: Editorial");
    expect(summary).toHaveTextContent("View 03 of 05");

    const navigation = screen.getByRole("navigation", {
      hidden: true,
      name: "Presentation choices",
    });
    const classicLink = within(navigation).getByRole("link", {
      hidden: true,
      name: /Classic/,
    });
    const details = summary.closest("details");
    const closeButton = screen.getByRole("button", {
      hidden: true,
      name: ui.designSwitcherCloseLabel,
    });

    expect(details).not.toBeNull();
    details?.setAttribute("open", "");
    fireEvent.click(closeButton);
    expect(details).not.toHaveAttribute("open");
    expect(summary).toHaveFocus();

    details?.setAttribute("open", "");
    document.addEventListener("click", (event) => event.preventDefault(), {
      capture: true,
      once: true,
    });
    fireEvent.click(classicLink);
    expect(details).not.toHaveAttribute("open");
  });
});
