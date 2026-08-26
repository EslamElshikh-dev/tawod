import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const outputDirectory = join(root, "out");
const vercelConfig = JSON.parse(
  readFileSync(join(root, "vercel.json"), "utf8"),
);
const excludedDirectories = new Set([
  ".git",
  ".next",
  "app",
  "lib",
  "node_modules",
  "out",
  "public",
]);
const intentionalHtmlTransforms = new Map([
  [
    "projects.html",
    [
      'data-project="villa-plaster-ceramic-marble-uhud-riyadh"',
      'data-project="alrajhi-tanks-king-salman-park"',
      'data-project="modon-eight-warehouses"',
      'data-project="arouba-mosque-villas"',
      'href="project-villa-plaster-ceramic-marble-uhud-riyadh.html"',
      'href="project-alrajhi-tanks-king-salman-park.html"',
      'href="project-modon-eight-warehouses-riyadh.html"',
      'href="project-arouba-mosque-villas.html"',
      'src="images/projects/villa-plaster-ceramic-marble-uhud-riyadh-01.webp"',
      'src="images/projects/alrajhi-tanks-king-salman-park-01.webp"',
      'src="images/projects/modon-eight-warehouses-02-v3.webp"',
    ],
  ],
  [
    "project-modon-eight-warehouses-riyadh.html",
    [
      "images/projects/modon-eight-warehouses-01-v3.webp",
      "images/projects/modon-eight-warehouses-02-v3.webp",
    ],
  ],
]);

function collectHtmlFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) {
        files.push(...collectHtmlFiles(join(directory, entry.name)));
      }
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(join(directory, entry.name));
    }
  }
  return files;
}

if (!existsSync(outputDirectory)) {
  throw new Error("Run npm run build before verifying the export.");
}

const sourceFiles = collectHtmlFiles(root);
const mismatches = [];

if (vercelConfig.buildCommand !== "npm run build") {
  mismatches.push("vercel.json: buildCommand must run the verified Next.js build");
}
if (vercelConfig.outputDirectory !== "out") {
  mismatches.push("vercel.json: outputDirectory must publish the verified out directory");
}

for (const sourceFile of sourceFiles) {
  const relativePath = relative(root, sourceFile).split(sep).join("/");
  const outputFile = join(outputDirectory, ...relativePath.split("/"));

  if (!existsSync(outputFile)) {
    mismatches.push(`${relativePath}: missing from out`);
    continue;
  }

  const source = readFileSync(sourceFile);
  const output = readFileSync(outputFile);
  if (source.equals(output)) continue;

  const expectedMarkers = intentionalHtmlTransforms.get(relativePath);
  if (expectedMarkers) {
    const outputHtml = output.toString("utf8");
    for (const marker of expectedMarkers) {
      if (!outputHtml.includes(marker)) {
        mismatches.push(`${relativePath}: expected generated marker missing: ${marker}`);
      }
    }
    continue;
  }

  mismatches.push(`${relativePath}: exported bytes differ from source`);
}

for (const relativePath of [
  "assets/css/tawod-system.css",
  "assets/css/tawod-project-case.css",
  "assets/js/tawod-analytics.js",
  "images/logo/tawod-logo.png",
  "images/projects/villa-plaster-ceramic-marble-uhud-riyadh-01.webp",
  "images/projects/alrajhi-tanks-king-salman-park-01.webp",
  "images/projects/modon-eight-warehouses-01-v3.webp",
  "images/projects/modon-eight-warehouses-02-v3.webp",
  "maintenance/assets/css/maintenance.css",
  "robots.txt",
  "sitemap.xml",
  "sitemap-projects.xml",
]) {
  const sourceFile = join(root, relativePath);
  const outputFile = join(outputDirectory, relativePath);
  if (!existsSync(outputFile)) {
    mismatches.push(`${relativePath}: static asset missing from out`);
    continue;
  }
  if (!readFileSync(sourceFile).equals(readFileSync(outputFile))) {
    mismatches.push(`${relativePath}: exported asset differs from source`);
  }
}

if (mismatches.length) {
  throw new Error(`Next.js export parity failed:\n${mismatches.join("\n")}`);
}

console.log(`Verified ${sourceFiles.length} HTML pages, intentional project-image transforms, and critical static assets.`);
