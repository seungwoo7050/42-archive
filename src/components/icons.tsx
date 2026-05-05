import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      viewBox="0 0 18 18"
      width="18"
      {...props}
    >
      <path
        d="M3.75 9h10.5m0 0-4.2-4.2M14.25 9l-4.2 4.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      viewBox="0 0 18 18"
      width="18"
      {...props}
    >
      <path
        d="M5 13 13 5m0 0H6.75M13 5v6.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function ActivityIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 20 20"
      width="20"
      {...props}
    >
      <path
        d="M2.5 10h3.1l1.65-4.5 3.5 9 1.8-4.5h4.95"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function CityIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 20 20"
      width="20"
      {...props}
    >
      <path
        d="M3.75 16.25V6.5l4.5-2.75 4.5 2.75v9.75m-9 0h12.5m-8.9-8.1h1.8m-1.8 3h1.8m2.1-3h1.8m-1.8 3h1.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.55"
      />
    </svg>
  );
}
