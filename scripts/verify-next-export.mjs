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
  if (!source.equals(output)) {
    mismatches.push(`${relativePath}: exported bytes differ from source`);
  }
}

for (const relativePath of [
  "assets/css/tawod-system.css",
  "assets/js/tawod-analytics.js",
  "images/logo/tawod-logo.png",
  "maintenance/assets/css/maintenance.css",
  "robots.txt",
  "sitemap.xml",
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

console.log(`Verified byte-for-byte parity for ${sourceFiles.length} HTML pages and critical static assets.`);
