import {
  siC,
  siCmake,
  siCplusplus,
  siDocker,
  siEslint,
  siNextdotjs,
  siNodedotjs,
  siPostgresql,
  siPrisma,
  siReact,
  siRedis,
  siTailwindcss,
  siTypescript,
  siVitest,
  type SimpleIcon,
} from "simple-icons";
import type { TechStackIcon } from "@/lib/portfolio";

const iconMap: Partial<Record<TechStackIcon, SimpleIcon>> = {
  c: siC,
  cmake: siCmake,
  cplusplus: siCplusplus,
  docker: siDocker,
  eslint: siEslint,
  nextjs: siNextdotjs,
  nodejs: siNodedotjs,
  postgresql: siPostgresql,
  prisma: siPrisma,
  react: siReact,
  redis: siRedis,
  tailwind: siTailwindcss,
  typescript: siTypescript,
  vitest: siVitest,
};

export function TechIcon({
  color,
  icon,
}: {
  color: string;
  icon: TechStackIcon;
}) {
  const simpleIcon = iconMap[icon];

  if (simpleIcon) {
    return (
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d={simpleIcon.path} />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
    >
      <FallbackIcon color={color} icon={icon} />
    </svg>
  );
}

function FallbackIcon({
  color,
  icon,
}: {
  color: string;
  icon: TechStackIcon;
}) {
  const stroke = "currentColor";

  if (icon === "terminal") {
    return (
      <path
        d="m5 8 4 4-4 4m6 0h8"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    );
  }

  if (icon === "shield") {
    return (
      <path
        d="M12 21c4-1.5 6-4.2 6-8V6.5L12 4 6 6.5V13c0 3.8 2 6.5 6 8Z"
        stroke={stroke}
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    );
  }

  if (icon === "check") {
    return (
      <path
        d="m5 12.2 4.1 4.1L19 7"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    );
  }

  if (icon === "database") {
    return (
      <path
        d="M5 7c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3Zm0 0v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7m-14 5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"
        stroke={stroke}
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    );
  }

  if (icon === "flow") {
    return (
      <path
        d="M7 6h10M7 18h10M12 6v12m-6-2 6 2 6-2"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    );
  }

  if (icon === "box") {
    return (
      <path
        d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 0v8.8m8-4.3-8 4.3-8-4.3"
        stroke={stroke}
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    );
  }

  if (icon === "api" || icon === "json") {
    return (
      <path
        d="M8 8 4 12l4 4m8-8 4 4-4 4M14 5l-4 14"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    );
  }

  return (
    <>
      <circle cx="12" cy="12" r="7" stroke={stroke} strokeWidth="1.6" />
      <circle cx="12" cy="12" fill={color} r="2.5" />
    </>
  );
}
