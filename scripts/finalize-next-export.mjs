import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const root = process.cwd();
const outputDirectory = join(root, "out");

if (!existsSync(outputDirectory)) {
  throw new Error("Next.js export directory was not created.");
}

const rootRouteOutput = join(outputDirectory, "index");
const rootHtmlOutput = join(outputDirectory, "index.html");
const rootHtmlSource = join(root, "index.html");
const localAssetRevisionCache = new Map();

function normalizeInternalHomepageLinks(html) {
  return html
    .replace(/href="(?:\.\.\/)*index\.html(?=[#"])/gi, 'href="/')
    .replace(/href='(?:\.\.\/)*index\.html(?=[#'])/gi, "href='/");
}

function versionLocalAssets(html) {
  return html.replace(
    /((?:(?:\.\.\/)*|\/)assets\/(css|js)\/([a-zA-Z0-9._-]+\.(?:css|js)))(?:\?v=[^"'\s>]*)?/g,
    (match, url, assetType, fileName) => {
      const relativeAssetPath = `assets/${assetType}/${fileName}`;
      const absoluteAssetPath = join(root, relativeAssetPath);
      if (!existsSync(absoluteAssetPath)) return match;
      let revision = localAssetRevisionCache.get(relativeAssetPath);
      if (!revision) {
        revision = createHash("sha256")
          .update(readFileSync(absoluteAssetPath))
          .digest("hex")
          .slice(0, 12);
        localAssetRevisionCache.set(relativeAssetPath, revision);
      }
      return `${url}?v=${revision}`;
    },
  );
}

if (!existsSync(rootRouteOutput)) {
  throw new Error("Next.js did not create the static root route output.");
}

const approvedHomepage = versionLocalAssets(
  normalizeInternalHomepageLinks(
    readFileSync(rootHtmlSource, "utf8").replaceAll(
      ">فيلا حي الفيصلية<",
      ">فيلا سكنية | حي الفيصلية<",
    ),
  ),
);

if (readFileSync(rootRouteOutput, "utf8") !== approvedHomepage) {
  throw new Error("The exported root route differs from the approved homepage.");
}

renameSync(rootRouteOutput, rootHtmlOutput);
writeFileSync(
  join(outputDirectory, "404.html"),
  normalizeInternalHomepageLinks(readFileSync(join(root, "404.html"), "utf8")),
);
console.log("Finalized the approved homepage and 404 page in the Next.js export.");
