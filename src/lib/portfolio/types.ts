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

export type HomeTemplateId = "design" | "classic";

export type PresentationTemplate = {
  id: HomeTemplateId;
  label: string;
  description: string;
};

export type HomeSectionId =
  | "contact"
  | "featured"
  | "journey"
  | "stack"
  | "technicalFocus"
  | "workMap";

export type SectionCopy = {
  actionLabel?: string;
  title: string;
  body?: string;
};

export type WorkMapCountKey =
  | "curriculumCount"
  | "productCount"
  | "reliabilityCount";

export type WorkMapCard = {
  id: string;
  label: string;
  body: string;
  countKey: WorkMapCountKey;
};

export type WorkMapPresentation = SectionCopy & {
  cards: WorkMapCard[];
};

export type HomeStatPresentation = {
  label: string;
  countKey: WorkMapCountKey;
};

export type DesignHomeHeroPresentation = {
  primaryActionLabel: string;
  leadLabel: string;
  leadActionLabel: string;
  stats: HomeStatPresentation[];
};

export type ClassicHomeHeroPresentation = {
  primaryActionLabel: string;
};

export type TerminalCommand = {
  command: string;
  output: string[];
};

export type TerminalPresentation = {
  title: string;
  bootLine: string;
  promptUser: string;
  promptPath: string;
  commands: TerminalCommand[];
};

export type HomePresentation = {
  design: {
    hero: DesignHomeHeroPresentation;
    sections: HomeSectionId[];
    featured: SectionCopy;
  };
  classic: {
    hero: ClassicHomeHeroPresentation;
    sections: HomeSectionId[];
    featured: SectionCopy;
    terminal: TerminalPresentation;
  };
  shared: {
    workMap: WorkMapPresentation;
    technicalFocus: SectionCopy;
    stack: SectionCopy;
    journey: SectionCopy;
    contact: {
      actionLabel: string;
      title: string;
    };
  };
};

export type ProjectGroupPresentation = {
  category: string;
  body: string;
};

export type ProjectPageCountKey =
  | "curriculumCount"
  | "projectCount"
  | "sourceOnlyCount";

export type ProjectPageContent = {
  groups: ProjectGroupPresentation[];
  design: {
    hero: {
      title: string;
      body: string;
      stats: {
        visibleEntries: string;
        archive: string;
        sourceFirst: string;
      };
    };
    featured: {
      eyebrow: string;
      title: string;
      body: string;
    };
    group: {
      countLabel: string;
    };
  };
  classic: {
    hero: {
      eyebrow: string;
      title: string;
      body: string;
      stats: Array<{
        label: string;
        countKey: ProjectPageCountKey;
      }>;
    };
    terminal: {
      ariaLabel: string;
      title: string;
      promptUser: string;
      promptPath: string;
      command: string;
      entryLabel: string;
      maxGroups: number;
    };
    selected: {
      eyebrow: string;
      title: string;
      body: string;
    };
    grouped: {
      eyebrow: string;
      title: string;
      body: string;
      countLabel: string;
    };
  };
};
