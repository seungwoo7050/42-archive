import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getPortfolioContent } from "@/lib/portfolio";

import { DesignSwitcher } from "./design-switcher";

afterEach(() => cleanup());

describe("DesignSwitcher", () => {
  it("tolerates native open state changed before hydration", async () => {
    const content = getPortfolioContent();
    const switcher = (
      <DesignSwitcher
        activeId="editorial"
        contentDebug
        currentPath="/projects"
        templates={content.presentation.templates}
        ui={content.presentation.ui}
      />
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(switcher);
    document.body.append(container);

    const details = container.querySelector("details");
    if (!details) {
      throw new Error("DesignSwitcher must render a details element.");
    }

    details.open = true;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    let root: ReturnType<typeof hydrateRoot> | undefined;

    try {
      await act(async () => {
        root = hydrateRoot(container, switcher);
        await Promise.resolve();
      });

      const hydrationErrors = consoleError.mock.calls
        .flatMap((call) => call.map(String))
        .filter((message) =>
          /hydration|server rendered HTML|did not match/i.test(message),
        );

      expect(details).toHaveAttribute("open");
      expect(hydrationErrors).toEqual([]);
    } finally {
      if (root) {
        await act(async () => root?.unmount());
      }
      consoleError.mockRestore();
      container.remove();
    }
  });

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
