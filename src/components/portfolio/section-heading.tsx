import { ContentHint } from "./content-hint";

export function SectionHeading({
  body,
  contentDebug,
  contentHint,
  title,
}: {
  body?: string;
  contentDebug?: boolean;
  contentHint?: string;
  title: string;
}) {
  return (
    <div className="max-w-2xl">
      {contentHint ? (
        <ContentHint enabled={contentDebug} path={contentHint} />
      ) : null}
      <h2 className="text-3xl font-semibold tracking-normal text-foreground md:text-4xl">
        {title}
      </h2>
      {body ? (
        <p className="mt-4 text-sm leading-6 text-muted md:text-base">{body}</p>
      ) : null}
    </div>
  );
}
