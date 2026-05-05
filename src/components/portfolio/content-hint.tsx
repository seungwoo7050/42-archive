export function ContentHint({
  enabled,
  path,
}: {
  enabled?: boolean;
  path: string;
}) {
  if (!enabled) {
    return null;
  }

  return (
    <span
      aria-label={`Content source: ${path}`}
      className="mb-2 inline-flex w-fit rounded border border-warm/50 bg-warm/10 px-2 py-1 font-mono text-[0.68rem] font-semibold text-warm"
    >
      수정: {path}
    </span>
  );
}
