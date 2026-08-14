/* eslint-disable @typescript-eslint/no-require-imports */
const projects = require("./src/content/projects.json");

const baseUrl = "http://localhost:3300";
const designIds = [
  "design",
  "classic",
  "editorial",
  "brutalist",
  "cinematic",
];
const firstProject = projects.items.find((project) => project.enabled !== false);

if (!firstProject) {
  throw new Error("Lighthouse needs one enabled project route.");
}

const urls = designIds.flatMap((designId) => [
  `${baseUrl}/?view=${designId}`,
  `${baseUrl}/projects/${firstProject.id}?view=${designId}`,
]);
const median = { aggregationMethod: "median" };

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      startServerCommand: "npm run start:performance",
      startServerReadyPattern: "Ready in|started server",
      startServerReadyTimeout: 120_000,
      url: urls,
      settings: {
        chromeFlags: "--headless --no-sandbox",
        onlyCategories: ["performance", "accessibility"],
        preset: "desktop",
      },
    },
    assert: {
      assertions: {
        "categories:accessibility": [
          "error",
          { ...median, minScore: 0.95 },
        ],
        "categories:performance": ["error", { ...median, minScore: 0.9 }],
        "cumulative-layout-shift": [
          "error",
          { ...median, maxNumericValue: 0.1 },
        ],
        "largest-contentful-paint": [
          "error",
          { ...median, maxNumericValue: 2_500 },
        ],
        "total-blocking-time": [
          "error",
          { ...median, maxNumericValue: 200 },
        ],
      },
      includePassedAssertions: true,
    },
  },
};
