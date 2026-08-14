import { expect, test, type Page } from "@playwright/test";

import presentationJson from "../../src/content/presentation.json";
import { designIds, withExplicitDesign, type DesignId } from "./site-matrix";

const EVENT_TIMING_THRESHOLD_MS = 16;
const INTERACTION_TARGET_MS = 200;
const SAMPLE_COUNT = 3;
const DESIGN_SWITCHER_LABEL_PATTERN = new RegExp(
  `^${presentationJson.ui.designSwitcherAriaTemplate
    .split("{label}")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".+")}$`,
);

type EventTimingRecord = {
  duration: number;
  interactionId: number;
  name: string;
  startTime: number;
};

type InteractionProbe = {
  entries: EventTimingRecord[];
  observer: PerformanceObserver;
  sampleStartedAt: number;
  trustedClickCount: number;
};

type InteractionSample = {
  durationUpperBoundMs: number;
  reportedDuration: string;
};

declare global {
  interface Window {
    __portfolioInteractionProbe?: InteractionProbe;
  }
}

async function settleNextPaint(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(resolve, 0);
          });
        });
      }),
  );
}

async function installInteractionProbe(page: Page) {
  const supported = await page.evaluate((durationThreshold) => {
    if (!PerformanceObserver.supportedEntryTypes.includes("event")) {
      return false;
    }

    const probe: InteractionProbe = {
      entries: [],
      observer: undefined as unknown as PerformanceObserver,
      sampleStartedAt: performance.now(),
      trustedClickCount: 0,
    };
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const eventEntry = entry as PerformanceEntry & {
          interactionId?: number;
        };

        probe.entries.push({
          duration: eventEntry.duration,
          interactionId: eventEntry.interactionId ?? 0,
          name: eventEntry.name,
          startTime: eventEntry.startTime,
        });
      }
    });

    observer.observe({
      buffered: true,
      durationThreshold,
      type: "event",
    } as PerformanceObserverInit & { durationThreshold: number });
    probe.observer = observer;
    window.__portfolioInteractionProbe = probe;

    document.addEventListener(
      "click",
      (event) => {
        if (event.isTrusted) {
          const currentProbe = window.__portfolioInteractionProbe;

          if (currentProbe) {
            currentProbe.trustedClickCount += 1;
          }
        }
      },
      { capture: true },
    );

    return true;
  }, EVENT_TIMING_THRESHOLD_MS);

  expect(
    supported,
    "Chromium must expose PerformanceObserver Event Timing entries.",
  ).toBe(true);
}

async function resetInteractionProbe(page: Page) {
  await page.evaluate(() => {
    const probe = window.__portfolioInteractionProbe;

    if (!probe) {
      throw new Error("The interaction timing probe is not installed.");
    }

    probe.entries = [];
    probe.sampleStartedAt = performance.now();
    probe.trustedClickCount = 0;
  });
}

async function readInteractionSample(page: Page): Promise<InteractionSample> {
  await settleNextPaint(page);

  const snapshot = await page.evaluate(() => {
    const probe = window.__portfolioInteractionProbe;

    if (!probe) {
      throw new Error("The interaction timing probe is not installed.");
    }

    return {
      entries: probe.entries.filter(
        (entry) => entry.startTime >= probe.sampleStartedAt,
      ),
      trustedClickCount: probe.trustedClickCount,
    };
  });

  expect(
    snapshot.trustedClickCount,
    "Each sample must contain exactly one browser-trusted click.",
  ).toBe(1);

  const interactionEntries = snapshot.entries.filter(
    (entry) => entry.interactionId > 0,
  );

  if (interactionEntries.length === 0) {
    return {
      durationUpperBoundMs: EVENT_TIMING_THRESHOLD_MS,
      reportedDuration: `<${EVENT_TIMING_THRESHOLD_MS}ms`,
    };
  }

  const interactionIds = [
    ...new Set(interactionEntries.map((entry) => entry.interactionId)),
  ];
  expect(
    interactionIds,
    "One trusted click must resolve to one Event Timing interaction.",
  ).toHaveLength(1);

  const interactionId = interactionIds[0];
  const entries = interactionEntries.filter(
    (entry) => entry.interactionId === interactionId,
  );
  const duration = Math.max(...entries.map((entry) => entry.duration));

  return {
    durationUpperBoundMs: duration,
    reportedDuration: `${duration.toFixed(1)}ms`,
  };
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function reportAndAssertSamples({
  designId,
  projectName,
  samples,
  scenario,
}: {
  designId: DesignId;
  projectName: string;
  samples: InteractionSample[];
  scenario: string;
}) {
  expect(samples).toHaveLength(SAMPLE_COUNT);

  const upperBounds = samples.map((sample) => sample.durationUpperBoundMs);
  const medianUpperBoundMs = median(upperBounds);
  const maxUpperBoundMs = Math.max(...upperBounds);
  const output = [
    `[interaction-performance] ${projectName}`,
    designId,
    scenario,
    `samples=${samples.map((sample) => sample.reportedDuration).join(",")}`,
    `medianUpperBound=${medianUpperBoundMs.toFixed(1)}ms`,
    `maxUpperBound=${maxUpperBoundMs.toFixed(1)}ms`,
    `target=${INTERACTION_TARGET_MS}ms`,
  ].join(" ");

  console.info(output);

  expect(
    medianUpperBoundMs,
    `${designId} ${scenario} median interaction duration upper bound`,
  ).toBeLessThanOrEqual(INTERACTION_TARGET_MS);
  expect(
    maxUpperBoundMs,
    `${designId} ${scenario} maximum interaction duration upper bound`,
  ).toBeLessThanOrEqual(INTERACTION_TARGET_MS);
}

async function openDesignSwitcher(page: Page) {
  const navigation = page.getByRole("navigation", {
    name: presentationJson.ui.designNavigationAriaLabel,
  });
  const switcher = page.getByLabel(DESIGN_SWITCHER_LABEL_PATTERN);

  await switcher.click();
  await expect(navigation).toBeVisible();
  await settleNextPaint(page);

  return {
    closeButton: navigation.getByRole("button", {
      name: presentationJson.ui.designSwitcherCloseLabel,
    }),
    navigation,
    switcher,
  };
}

for (const designId of designIds) {
  test(`${designId}: design switcher close stays within the interaction target`, async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name.includes("mobile");
    const response = await page.goto(withExplicitDesign("/", designId));

    expect(response?.ok()).toBe(true);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await installInteractionProbe(page);

    const warmup = await openDesignSwitcher(page);
    await (isMobile ? warmup.closeButton : warmup.switcher).click();
    await expect(warmup.navigation).toBeHidden();
    await expect(warmup.switcher).toBeFocused();
    await settleNextPaint(page);

    const samples: InteractionSample[] = [];

    for (let sampleIndex = 0; sampleIndex < SAMPLE_COUNT; sampleIndex += 1) {
      const { closeButton, navigation, switcher } =
        await openDesignSwitcher(page);

      await resetInteractionProbe(page);
      await (isMobile ? closeButton : switcher).click();
      await expect(navigation).toBeHidden();
      await expect(switcher).toBeFocused();
      samples.push(await readInteractionSample(page));
    }

    reportAndAssertSamples({
      designId,
      projectName: testInfo.project.name,
      samples,
      scenario: "design-switcher-close",
    });
  });

  test(`${designId}: mobile menu toggle stays within the interaction target`, async ({
    page,
  }, testInfo) => {
    test.skip(
      !testInfo.project.name.includes("mobile"),
      "The menu toggle is measured with the mobile viewport.",
    );

    const response = await page.goto(withExplicitDesign("/", designId));

    expect(response?.ok()).toBe(true);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await installInteractionProbe(page);

    const navigation = page.locator(
      `nav[aria-label="${presentationJson.ui.mobileNavigationAriaLabel}"]`,
    );
    const menu = page
      .locator("details")
      .filter({ has: navigation })
      .locator(":scope > summary");

    await menu.click();
    await expect(navigation).toBeVisible();
    await menu.click();
    await expect(navigation).toBeHidden();
    await settleNextPaint(page);

    const samples: InteractionSample[] = [];

    for (let sampleIndex = 0; sampleIndex < SAMPLE_COUNT; sampleIndex += 1) {
      await resetInteractionProbe(page);
      await menu.click();
      await expect(navigation).toBeVisible();
      samples.push(await readInteractionSample(page));

      await menu.click();
      await expect(navigation).toBeHidden();
      await settleNextPaint(page);
    }

    reportAndAssertSamples({
      designId,
      projectName: testInfo.project.name,
      samples,
      scenario: "mobile-menu-open",
    });
  });
}
