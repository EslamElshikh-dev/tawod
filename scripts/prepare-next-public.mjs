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
    sources: ["assets/project-media/modon-01-v3.b64"],
    output: "images/projects/modon-eight-warehouses-01-v3.webp",
  },
  {
    sources: [
      "assets/project-media/modon-02-v4.part00.b64",
      "assets/project-media/modon-02-v4.part01.b64",
      "assets/project-media/modon-02-v4.part02.b64",
      "assets/project-media/modon-02-v4.part03.b64",
    ],
    output: "images/projects/modon-eight-warehouses-02-v3.webp",
  },
];

for (const image of encodedProjectImages) {
  for (const relativePath of image.sources) {
    if (!existsSync(join(root, relativePath))) {
      throw new Error(`Missing encoded project image part: ${relativePath}`);
    }
  }

  const encoded = image.sources
    .map((relativePath) => readFileSync(join(root, relativePath), "utf8").trim())
    .join("");
  const bytes = Buffer.from(encoded, "base64");
  const hasValidContainer =
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP" &&
    bytes.readUInt32LE(4) + 8 === bytes.length;

  if (!hasValidContainer) {
    throw new Error(
      `Invalid generated WebP payload: ${image.sources.join(", ")}`,
    );
  }

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
