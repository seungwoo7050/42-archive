export function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-semibold text-foreground">{title}</h2>
    </div>
  );
}

export function TwoColumnSection({
  body,
  eyebrow,
  title,
}: {
  body: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="grid gap-6 lg:grid-cols-[0.42fr_0.58fr]">
      <SectionTitle eyebrow={eyebrow} title={title} />
      <p className="text-base leading-7 text-muted">{body}</p>
    </section>
  );
}

export function ListSection({
  eyebrow,
  items,
  title,
}: {
  eyebrow: string;
  items: string[];
  title: string;
}) {
  return (
    <section className="grid gap-6 lg:grid-cols-[0.42fr_0.58fr]">
      <SectionTitle eyebrow={eyebrow} title={title} />
      <ul className="grid gap-3">
        {items.map((item) => (
          <li
            className="rounded-lg border border-line bg-surface p-4 text-sm leading-6 text-muted"
            key={item}
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
