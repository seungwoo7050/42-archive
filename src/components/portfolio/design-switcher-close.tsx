"use client";

export function DesignSwitcherClose({ label }: { label: string }) {
  return (
    <button
      aria-label={label}
      onClick={(event) => {
        const details = event.currentTarget.closest("details");
        const summary = details?.querySelector<HTMLElement>(":scope > summary");

        details?.removeAttribute("open");
        summary?.focus();
      }}
      type="button"
    >
      <span aria-hidden="true">×</span>
    </button>
  );
}
