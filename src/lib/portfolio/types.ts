import type {
  PresentationContentSource,
  ProjectGroup,
  ProjectMetric,
  ProjectMetricFilter,
} from "../content-schema";

export type {
  PortfolioProjectSource,
  ProjectGroup,
  ProjectMetric,
  ProjectMetricFilter,
  ProjectsContentSource,
} from "../content-schema";

export type NavigationItem = {
  label: string;
  href: string;
};

export type SiteContent = {
  title: string;
  description: string;
  language: string;
  brand: string;
  socialImage?: string;
  pages?: Record<SitePageId, boolean>;
  navigation: NavigationItem[];
  footer: {
    note: string;
    copyright: string;
  };
};

export type SitePageId =
  | "projects"
  | "about"
  | "resume"
  | "contact"
  | "journey"
  | "interviewMap"
  | "curation";

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

export type ContentLink = {
  id?: string;
  type: LinkType;
  label: string;
  href: string;
  external?: boolean;
  enabled?: boolean;
  placements?: Array<"hero" | "contact" | "card" | "detail" | "footer">;
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
  groupId: string;
  tags: string[];
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

export type SiteDesignId =
  | "design"
  | "classic"
  | "editorial"
  | "brutalist"
  | "cinematic";

export type HomeTemplateId = SiteDesignId;

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

export type HomePresentation = PresentationContentSource["home"];

export type ProjectGroupPresentation = {
  category: string;
  body: string;
};

export type ProjectPageCountKey =
  | "curriculumCount"
  | "projectCount"
  | "sourceOnlyCount";

export type ProjectPageContent = PresentationContentSource["pages"]["projects"];

export type ProjectDetailPageContent =
  PresentationContentSource["pages"]["projectDetail"];

export type AboutPageContent = PresentationContentSource["pages"]["about"];

export type JourneyPageContent = PresentationContentSource["pages"]["journey"];

export type InterviewMapPageContent =
  PresentationContentSource["pages"]["interviewMap"];

export type ResumePageContent = PresentationContentSource["pages"]["resume"];

export type ContactPageContent = PresentationContentSource["pages"]["contact"];

export type PresentationContent = PresentationContentSource;

export type TechStackIcon =
  | "api"
  | "box"
  | "c"
  | "check"
  | "cmake"
  | "cplusplus"
  | "database"
  | "docker"
  | "eslint"
  | "flow"
  | "json"
  | "nextjs"
  | "nodejs"
  | "playwright"
  | "postgresql"
  | "prisma"
  | "react"
  | "redis"
  | "shield"
  | "tailwind"
  | "terminal"
  | "tool"
  | "typescript"
  | "vitest";

export type TechStackItem = {
  id: string;
  label: string;
  icon: TechStackIcon;
  color: string;
};

export type SkillFocusArea = {
  title: string;
  body: string;
};

export type SkillGroup = {
  title: string;
  items: string[];
};

export type SkillsContent = {
  focusAreas: SkillFocusArea[];
  groups: SkillGroup[];
};

export type ExperienceItem = {
  period: string;
  title: string;
  body: string;
};

export type JourneyItem = {
  date: string;
  endDate: string | null;
  title: string;
  category: string;
  body: string;
  projectId: string | null;
  sourcePath: string | null;
};

export type ContactContent = {
  title: string;
  intro: string;
  availability: string;
  preferred: string[];
  notes: string[];
};

export type ResumeTraining = {
  name: string;
  period: string;
  description: string;
};

export type ResumeEducation = {
  name: string;
  period: string;
  description: string;
};

export type ResumeContent = {
  downloadUrl: string | null;
  summary: string[];
  projectIds: string[];
  training: ResumeTraining[];
  education: ResumeEducation[];
  notes: string[];
};

export type JourneyMilestone = {
  id: string;
  date: string;
  title: string;
  state: string;
  reason: string;
  result: string;
  anchorProjectIds: string[];
};

export type JourneyNarrativeContent = {
  intro: string;
  milestones: JourneyMilestone[];
  currentPosition: {
    title: string;
    body: string;
  };
};

export type InterviewMapReference = {
  label: string;
  href: string;
};

export type InterviewMapAnswer = {
  projectId: string;
  depth: string;
};

export type InterviewMapItem = {
  label: string;
  reference: string;
  answers: InterviewMapAnswer[];
};

export type InterviewMapTrack = {
  id: string;
  label: string;
  body: string;
  items: InterviewMapItem[];
};

export type InterviewMapContent = {
  intro: string;
  referenceRepo: InterviewMapReference;
  tracks: InterviewMapTrack[];
  gaps: {
    title: string;
    body: string;
    items: string[];
  };
};

export type CurationCategory = {
  id: string;
  label: string;
  rationale: string;
  projectIds: string[];
};

export type CurationOmissionItem = {
  title: string;
  body: string;
};

export type CurationCriteriaItem = {
  title: string;
  body: string;
};

export type CurationContent = {
  intro: string;
  criteria: {
    title: string;
    items: CurationCriteriaItem[];
  };
  categories: CurationCategory[];
  omissions: {
    title: string;
    body: string;
    items: CurationOmissionItem[];
  };
  nextReview: {
    title: string;
    body: string;
  };
};

export type PortfolioContent = {
  site: SiteContent;
  profile: ProfileContent;
  projects: PortfolioProject[];
  projectGroups: ProjectGroup[];
  projectMetrics: ProjectMetric[];
  presentation: PresentationContent;
  skills: SkillsContent;
  techStack: TechStackItem[];
  experience: ExperienceItem[];
  journey: JourneyItem[];
  journeyNarrative: JourneyNarrativeContent;
  interviewMap: InterviewMapContent;
  curation: CurationContent;
  links: ContentLink[];
  contact: ContactContent;
  resume: ResumeContent;
};

export type RouteSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;
