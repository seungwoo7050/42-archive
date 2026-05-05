export type NavigationItem = {
  label: string;
  href: string;
};

export type SiteContent = {
  title: string;
  description: string;
  language: string;
  brand: string;
  navigation: NavigationItem[];
  footer: {
    note: string;
    copyright: string;
  };
};

export type ProfilePrinciple = {
  title: string;
  body: string;
};

export type ProfilePhoto = {
  src: string;
  alt: string;
};

export type ProfileContent = {
  name: string;
  koreanName: string;
  handle: string;
  role: string;
  headline: string;
  summary: string;
  location: string;
  availability: string;
  photo?: ProfilePhoto;
  principles: ProfilePrinciple[];
};

export type LinkType =
  | "case-study"
  | "demo"
  | "email"
  | "github"
  | "resume"
  | "source"
  | "website";

export type EnvKey = "NEXT_PUBLIC_DASHBOARD_URL" | "NEXT_PUBLIC_SEOUL_APP_URL";

export type ContentLink = {
  id?: string;
  type: LinkType;
  label: string;
  href: string;
  envKey?: EnvKey;
  external?: boolean;
  enabled?: boolean;
};

export type DeploymentStatus =
  | "archived"
  | "case-study-only"
  | "live"
  | "offline"
  | "private"
  | "source-only";

export type DeploymentState = {
  status: DeploymentStatus;
  label: string;
  showBadge?: boolean;
};

export type ProjectImage = {
  src: string;
  alt: string;
};

export type ProjectArchitecture = {
  summary: string;
  items: string[];
};

export type PortfolioProject = {
  id: string;
  order: string;
  title: string;
  category: string;
  featured?: boolean;
  enabled?: boolean;
  period: string;
  role: string;
  summary: string;
  description: string;
  deployment: DeploymentState;
  screenshot: ProjectImage;
  screenshots: ProjectImage[];
  stack: string[];
  links: ContentLink[];
  highlights: string[];
  problem: string;
  solution: string;
  architecture: ProjectArchitecture;
  decisions: string[];
  tradeoffs: string[];
  results: string[];
};
