import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const publicDirectory = join(root, "public");
const directories = ["assets", "images", "maintenance/assets"];
const files = [
  "CNAME",
  "google-ads-page-feed.csv",
  "robots.txt",
  "sitemap.xml",
  "sitemap-dammam.xml",
  "sitemap-dhahran.xml",
  "sitemap-khobar.xml",
  "sitemap-turnkey.xml",
];

rmSync(publicDirectory, { recursive: true, force: true });
mkdirSync(publicDirectory, { recursive: true });

for (const relativePath of directories) {
  const source = join(root, relativePath);
  if (!existsSync(source)) {
    throw new Error(`Missing static directory: ${relativePath}`);
  }
  cpSync(source, join(publicDirectory, relativePath), { recursive: true });
}

for (const relativePath of files) {
  const source = join(root, relativePath);
  if (!existsSync(source)) {
    throw new Error(`Missing static file: ${relativePath}`);
  }
  cpSync(source, join(publicDirectory, relativePath));
}

console.log(`Prepared ${directories.length} directories and ${files.length} root files for Next.js.`);
