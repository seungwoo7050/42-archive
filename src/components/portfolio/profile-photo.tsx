import type { ProfilePhoto as ProfilePhotoContent } from "@/lib/portfolio";

export function ProfilePhoto({
  photo,
}: {
  photo: ProfilePhotoContent;
}) {
  return (
    <figure className="profile-photo-frame">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={photo.alt}
        className="h-full w-full object-cover"
        loading="eager"
        src={photo.src}
      />
    </figure>
  );
}
