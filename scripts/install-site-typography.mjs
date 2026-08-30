import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join, relative, sep } from "node:path";
import process from "node:process";

const root = process.cwd();
const check = process.argv.includes("--check");
const typographyCss = "assets/css/tawod-typography.css";
const typographyRevision = createHash("sha256")
  .update(readFileSync(join(root, typographyCss)))
  .digest("hex")
  .slice(0, 12);
const ignoredDirectories = new Set([
  ".git",
  ".next",
  "node_modules",
  "out",
  "public",
]);
const preloadStart = "<!-- TAWOD_FONT_PRELOADS_START -->";
const preloadEnd = "<!-- TAWOD_FONT_PRELOADS_END -->";
const cssStart = "<!-- TAWOD_TYPOGRAPHY_CSS_START -->";
const cssEnd = "<!-- TAWOD_TYPOGRAPHY_CSS_END -->";
const preloads = `${preloadStart}
<link rel="preload" as="font" href="/assets/fonts/alexandria-arabic-variable.woff2" type="font/woff2" crossorigin>
<link rel="preload" as="font" href="/assets/fonts/ibm-plex-sans-arabic-regular.woff2" type="font/woff2" crossorigin>
${preloadEnd}`;
const stylesheet = `${cssStart}
<link rel="stylesheet" href="/${typographyCss}?v=${typographyRevision}">
${cssEnd}`;

function collectHtml(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...collectHtml(join(directory, entry.name)));
      }
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(join(directory, entry.name));
    }
  }
  return files;
}

function removeMarkedBlock(html, start, end) {
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.replace(new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}\\s*`, "g"), "");
}

function isFontPreload(tag) {
  return /\brel=["']preload["']/i.test(tag)
    && /\bas=["']font["']/i.test(tag)
    && /(?:alexandria-arabic-variable|ibm-plex-sans-arabic-(?:regular|medium|semibold))\.woff2/i.test(tag);
}

function normalizeTypography(html) {
  const hasHeadStart = /<head\b/i.test(html);
  const hasHeadEnd = /<\/head>/i.test(html);
  let next = removeMarkedBlock(html, preloadStart, preloadEnd);
  next = removeMarkedBlock(next, cssStart, cssEnd);
  next = next.replace(/<link\b[^>]*>/gi, (tag) => {
    if (/fonts\.(?:googleapis|gstatic)\.com/i.test(tag)) return "";
    if (isFontPreload(tag)) return "";
    if (/tawod-typography\.css/i.test(tag)) return "";
    return tag;
  });
  next = next.replace(/^[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n");

  if (hasHeadStart) {
    const firstStyleResource = /<!-- TAWOD_CRITICAL_CSS_START -->|<style\b|<link\b(?=[^>]*\brel=["']stylesheet["'])/i;
    if (firstStyleResource.test(next)) {
      next = next.replace(firstStyleResource, `${preloads}\n$&`);
    } else if (hasHeadEnd) {
      next = next.replace(/<\/head>/i, `${preloads}\n</head>`);
    }
  }
  if (!hasHeadEnd) return next;
  return next.includes("<!-- TAWOD_ANALYTICS_START -->")
    ? next.replace("<!-- TAWOD_ANALYTICS_START -->", `${stylesheet}\n<!-- TAWOD_ANALYTICS_START -->`)
    : next.replace(/<\/head>/i, `${stylesheet}\n</head>`);
}

if (!existsSync(join(root, typographyCss))) {
  throw new Error(`Missing typography stylesheet: ${typographyCss}`);
}

const changed = [];
for (const file of collectHtml(root)) {
  const current = readFileSync(file, "utf8");
  const next = normalizeTypography(current);
  if (next === current) continue;
  changed.push(relative(root, file).split(sep).join("/"));
  if (!check) writeFileSync(file, next);
}

if (check && changed.length) {
  console.error("Typography assets are out of date. Run npm run build:typography.");
  for (const file of changed) console.error(` - ${file}`);
  process.exit(1);
}

console.log(`${check ? "Checked" : "Installed"} site typography across ${collectHtml(root).length} HTML files; ${changed.length} ${check ? "would change" : "changed"}.`);
