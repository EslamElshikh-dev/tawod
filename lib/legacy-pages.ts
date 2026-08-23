import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, posix, sep } from "node:path";

const siteRoot = process.cwd();
const excludedDirectories = new Set([
  ".git",
  ".next",
  "app",
  "lib",
  "node_modules",
  "out",
  "public",
]);

function toPosixPath(value: string) {
  return value.split(sep).join(posix.sep);
}

function collectHtmlFiles(directory: string, relativeDirectory = ""): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = relativeDirectory
      ? join(relativeDirectory, entry.name)
      : entry.name;

    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) {
        files.push(...collectHtmlFiles(join(directory, entry.name), relativePath));
      }
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(toPosixPath(relativePath));
    }
  }

  return files.sort((a, b) => a.localeCompare(b, "en"));
}

let cachedHtmlFiles: string[] | undefined;

export function getLegacyHtmlFiles() {
  cachedHtmlFiles ??= collectHtmlFiles(siteRoot);
  return cachedHtmlFiles;
}

export function getRoutedLegacyHtmlFiles() {
  return getLegacyHtmlFiles().filter(
    (file) => file !== "index.html" && file !== "404.html",
  );
}

export function readLegacyHtml(relativePath: string) {
  if (!getLegacyHtmlFiles().includes(relativePath)) {
    throw new Error(`Unknown legacy HTML route: ${relativePath}`);
  }

  const absolutePath = join(siteRoot, ...relativePath.split("/"));
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing legacy HTML source: ${relativePath}`);
  }

  return readFileSync(absolutePath, "utf8");
}

export function htmlResponse(relativePath: string) {
  return new Response(readLegacyHtml(relativePath), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
