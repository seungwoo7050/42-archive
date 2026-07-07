import { existsSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

import {
  PortfolioContentError,
  type ContentValidationIssue,
  type PortfolioSource,
} from "./content-loader";

type AssetReference = {
  assetPath: string;
  file: string;
  path: string;
};

function collectAssetReferences(content: PortfolioSource): AssetReference[] {
  const references: AssetReference[] = [];

  if (content.site.socialImage) {
    references.push({
      assetPath: content.site.socialImage,
      file: "src/content/site.json",
      path: "$.socialImage",
    });
  }

  if (content.profile.photo) {
    references.push({
      assetPath: content.profile.photo.src,
      file: "src/content/profile.json",
      path: "$.photo.src",
    });
  }

  if (content.resume.downloadUrl) {
    references.push({
      assetPath: content.resume.downloadUrl,
      file: "src/content/resume.json",
      path: "$.downloadUrl",
    });
  }

  content.projects.items.forEach((project, projectIndex) => {
    references.push({
      assetPath: project.screenshot.src,
      file: "src/content/projects.json",
      path: `$.items[${projectIndex}].screenshot.src`,
    });
    project.screenshots.forEach((screenshot, screenshotIndex) =>
      references.push({
        assetPath: screenshot.src,
        file: "src/content/projects.json",
        path: `$.items[${projectIndex}].screenshots[${screenshotIndex}].src`,
      }),
    );
  });

  return references;
}

export function validatePortfolioAssets(
  content: PortfolioSource,
  publicRoot: string,
) {
  const issues: ContentValidationIssue[] = [];

  for (const reference of collectAssetReferences(content)) {
    const absoluteAssetPath = resolve(publicRoot, `.${reference.assetPath}`);
    const pathFromPublic = relative(publicRoot, absoluteAssetPath);

    if (
      pathFromPublic.startsWith("..") ||
      isAbsolute(pathFromPublic) ||
      !existsSync(absoluteAssetPath)
    ) {
      issues.push({
        file: reference.file,
        path: reference.path,
        message: `Asset "${reference.assetPath}" does not exist under public/.`,
      });
    }
  }

  if (issues.length > 0) {
    throw new PortfolioContentError(issues);
  }

  return content;
}
