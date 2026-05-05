import type { ProjectImage } from "@/lib/portfolio";

export function ProjectScreenshot({
  image,
  priority = false,
}: {
  image: ProjectImage;
  priority?: boolean;
}) {
  return (
    <figure className="project-screenshot overflow-hidden rounded-lg border border-line bg-surface-soft">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={image.alt}
        className="aspect-[16/10] w-full object-cover object-top transition duration-500 ease-out group-hover:scale-[1.035]"
        loading={priority ? "eager" : "lazy"}
        src={image.src}
      />
    </figure>
  );
}
