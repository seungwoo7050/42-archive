import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readDocument(fileName: string) {
  return readFileSync(resolve(projectRoot, fileName), "utf8");
}

function collectMarkdownFiles(relativePath: string): string[] {
  const absolutePath = resolve(projectRoot, relativePath);
  if (!existsSync(absolutePath)) {
    return [];
  }
  if (!statSync(absolutePath).isDirectory()) {
    return extname(absolutePath) === ".md" ? [relativePath] : [];
  }

  return readdirSync(absolutePath, { withFileTypes: true })
    .flatMap((entry) =>
      collectMarkdownFiles(resolve(relativePath, entry.name)),
    )
    .sort();
}

function withoutFencedCode(markdown: string) {
  return markdown.replace(/^(```|~~~)[\s\S]*?^\1.*$/gm, "");
}

function githubHeadingAnchors(markdown: string) {
  const anchors = new Set<string>();
  const occurrences = new Map<string, number>();

  for (const match of withoutFencedCode(markdown).matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)) {
    const base = match[1]
      .replace(/<[^>]+>/g, "")
      .replace(/`([^`]*)`/g, "$1")
      .toLocaleLowerCase("en-US")
      .replace(/[^\p{Letter}\p{Number}\s_-]/gu, "")
      .trim()
      .replace(/\s+/g, "-");
    const count = occurrences.get(base) ?? 0;
    occurrences.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }

  return anchors;
}

function localMarkdownLinks(fileName: string) {
  const markdown = withoutFencedCode(readDocument(fileName));
  return [...markdown.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)]
    .map((match) => match[1])
    .filter((href) => !/^[a-z][a-z\d+.-]*:/i.test(href));
}

const projectDocuments = [
  ...collectMarkdownFiles("README.md"),
  ...collectMarkdownFiles("docs"),
  ...collectMarkdownFiles("architecture"),
  ...collectMarkdownFiles("devlog"),
  ...collectMarkdownFiles("src/app/fonts/FONT_SOURCES.md"),
];

describe("engineering documentation", () => {
  it.each([
    "docs/architecture.md",
    "docs/content-pipeline.md",
    "docs/development.md",
    "docs/operations.md",
    "docs/case-study.md",
  ])("keeps %s as a titled Markdown document", (fileName) => {
    expect(readDocument(fileName)).toMatch(/^# .+/);
  });

  it("records the validated content path to each design renderer", () => {
    const architecture = readDocument("docs/architecture.md");
    const pipeline = readDocument("docs/content-pipeline.md");

    expect(architecture).toContain("src/lib/content-loader.ts");
    expect(architecture).toContain("src/lib/portfolio/view-models.ts");
    expect(architecture).toContain("src/designs/registry.tsx");
    expect(pipeline).toContain("```mermaid");
    expect(pipeline).toContain("PORTFOLIO_CONTENT_MODE");
    expect(pipeline).toContain("프로덕션 준비 상태");
  });

  it("keeps the local verification commands in the development guide", () => {
    const development = readDocument("docs/development.md");

    for (const command of [
      "npm run content:check",
      "npm run lint",
      "npm run typecheck",
      "npm run test",
      "npm run build",
      "npm run test:e2e:production",
      "npm run test:container",
    ]) {
      expect(development).toContain(command);
    }
  });

  it("separates template checks from production readiness", () => {
    const operations = readDocument("docs/operations.md");

    expect(operations).toContain("PORTFOLIO_CONTENT_MODE=template");
    expect(operations).toContain("PORTFOLIO_CONTENT_MODE=production");
    expect(operations).toContain("SITE_URL");
    expect(operations).toContain("noindex");
  });

  it("keeps unsupported claims and template inputs out of the case study", () => {
    const caseStudy = readDocument("docs/case-study.md");

    expect(caseStudy).toContain(
      "사용자 수나 전환율은 측정 자료가 없으므로 성과로 쓰지 않습니다.",
    );
    expect(caseStudy).not.toMatch(
      /^- (본인 역할|성과 수치|지원 직무):\s*$/m,
    );
  });

  it("keeps every relative Markdown link and heading anchor valid", () => {
    const failures: string[] = [];

    for (const fileName of projectDocuments) {
      for (const href of localMarkdownLinks(fileName)) {
        const [pathPart, fragment] = href.split("#", 2);
        let decodedPath: string;
        let decodedFragment: string;
        try {
          decodedPath = decodeURIComponent(pathPart.split("?", 1)[0]);
          decodedFragment = decodeURIComponent(fragment ?? "");
        } catch {
          failures.push(`${fileName}: malformed link ${href}`);
          continue;
        }

        const target = decodedPath
          ? resolve(projectRoot, dirname(fileName), decodedPath)
          : resolve(projectRoot, fileName);
        if (!existsSync(target)) {
          failures.push(
            `${fileName}: missing ${relative(projectRoot, target)} (${href})`,
          );
          continue;
        }

        if (decodedFragment && extname(target) === ".md") {
          const anchors = githubHeadingAnchors(readFileSync(target, "utf8"));
          if (!anchors.has(decodedFragment.toLocaleLowerCase("en-US"))) {
            failures.push(`${fileName}: missing anchor ${href}`);
          }
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
