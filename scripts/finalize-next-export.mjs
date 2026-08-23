import { copyFileSync, existsSync, readFileSync, renameSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const outputDirectory = join(root, "out");

if (!existsSync(outputDirectory)) {
  throw new Error("Next.js export directory was not created.");
}

const rootRouteOutput = join(outputDirectory, "index");
const rootHtmlOutput = join(outputDirectory, "index.html");
const rootHtmlSource = join(root, "index.html");

if (!existsSync(rootRouteOutput)) {
  throw new Error("Next.js did not create the static root route output.");
}
if (!readFileSync(rootRouteOutput).equals(readFileSync(rootHtmlSource))) {
  throw new Error("The exported root route differs from the approved homepage.");
}

renameSync(rootRouteOutput, rootHtmlOutput);
copyFileSync(join(root, "404.html"), join(outputDirectory, "404.html"));
console.log("Finalized the approved homepage and 404 page in the Next.js export.");
