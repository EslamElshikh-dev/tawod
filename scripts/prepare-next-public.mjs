import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const publicDirectory = join(root, "public");
const directories = ["assets", "images", "maintenance/assets"];
const files = [
  "CNAME",
  "google-ads-page-feed.csv",
  "robots.txt",
  "sitemap.xml",
  "sitemap-projects.xml",
  "sitemap-dammam.xml",
  "sitemap-dhahran.xml",
  "sitemap-khobar.xml",
  "sitemap-turnkey.xml",
];
const encodedProjectImages = [
  {
    source: "assets/project-media/modon-01-v3.b64",
    output: "images/projects/modon-eight-warehouses-01-v3.webp",
  },
  {
    source: "assets/project-media/modon-02-v3.b64",
    output: "images/projects/modon-eight-warehouses-02-v3.webp",
  },
];

for (const image of encodedProjectImages) {
  const source = join(root, image.source);
  if (!existsSync(source)) {
    throw new Error(`Missing encoded project image: ${image.source}`);
  }

  const encoded = readFileSync(source, "utf8")
    .trim()
    .replace(/\.\.\. \(truncated\)\s*$/u, "");
  const decoded = Buffer.from(encoded, "base64");
  const hasWebpHeader =
    decoded.length >= 12 &&
    decoded.subarray(0, 4).toString("ascii") === "RIFF" &&
    decoded.subarray(8, 12).toString("ascii") === "WEBP";

  if (!hasWebpHeader) {
    throw new Error(`Invalid generated WebP payload: ${image.source}`);
  }

  const declaredLength = decoded.readUInt32LE(4) + 8;
  if (declaredLength > decoded.length) {
    throw new Error(
      `Truncated generated WebP payload: ${image.source}; declared=${declaredLength}, decoded=${decoded.length}`,
    );
  }

  // Ignore accidental trailing text/bytes after the complete RIFF container.
  const bytes = decoded.subarray(0, declaredLength);
  const output = join(root, image.output);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, bytes);
}

rmSync(publicDirectory, { recursive: true, force: true });
mkdirSync(publicDirectory, { recursive: true });

for (const relativePath of directories) {
  const source = join(root, relativePath);
  if (!existsSync(source)) {
    throw new Error(`Missing static directory: ${relativePath}`);
  }
  cpSync(source, join(publicDirectory, relativePath), { recursive: true });
}

rmSync(join(publicDirectory, "assets/project-media"), {
  recursive: true,
  force: true,
});

for (const relativePath of files) {
  const source = join(root, relativePath);
  if (!existsSync(source)) {
    throw new Error(`Missing static file: ${relativePath}`);
  }
  cpSync(source, join(publicDirectory, relativePath));
}

console.log(
  `Prepared ${directories.length} directories, ${files.length} root files, and ${encodedProjectImages.length} validated project images for Next.js.`,
);
