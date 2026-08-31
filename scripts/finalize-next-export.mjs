import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const outputDirectory = join(root, "out");
const adsRescueScript = '<script src="/assets/js/tawod-ads-rescue.js" defer></script>';

if (!existsSync(outputDirectory)) {
  throw new Error("Next.js export directory was not created.");
}

const rootRouteOutput = join(outputDirectory, "index");
const rootHtmlOutput = join(outputDirectory, "index.html");
const rootHtmlSource = join(root, "index.html");

function normalizeInternalHomepageLinks(html) {
  return html
    .replace(/href="(?:\.\.\/)*index\.html(?=[#"])/gi, 'href="/')
    .replace(/href='(?:\.\.\/)*index\.html(?=[#'])/gi, "href='/");
}

function injectAdsRescue(html) {
  if (html.includes('/assets/js/tawod-ads-rescue.js')) return html;
  return html.replace(/<\/head>/i, `${adsRescueScript}</head>`);
}

if (!existsSync(rootRouteOutput)) {
  throw new Error("Next.js did not create the static root route output.");
}

const approvedHomepage = injectAdsRescue(normalizeInternalHomepageLinks(
  readFileSync(rootHtmlSource, "utf8").replaceAll(
    ">فيلا حي الفيصلية<",
    ">فيلا سكنية | حي الفيصلية<",
  ),
));

if (readFileSync(rootRouteOutput, "utf8") !== approvedHomepage) {
  throw new Error("The exported root route differs from the approved homepage plus the approved Ads rescue layer.");
}

renameSync(rootRouteOutput, rootHtmlOutput);
writeFileSync(
  join(outputDirectory, "404.html"),
  normalizeInternalHomepageLinks(readFileSync(join(root, "404.html"), "utf8")),
);
console.log("Finalized the approved homepage, Ads rescue layer and 404 page in the Next.js export.");
