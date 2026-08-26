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
const generatedProjectPages = [
  {
    sources: [
      "assets/project-pages/faisaliah-villa.part00.html",
      "assets/project-pages/faisaliah-villa.part01.html",
      "assets/project-pages/faisaliah-villa.part02.html",
      "assets/project-pages/faisaliah-villa.part03.html",
      "assets/project-pages/faisaliah-villa.part04.html",
    ],
    output: "project-faisaliah-villa-facades-finishing.html",
  },
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
  {
    sources: [
      "assets/project-media/alrajhi-tanks-v1.part00.b64",
      "assets/project-media/alrajhi-tanks-v1.part01.b64",
      "assets/project-media/alrajhi-tanks-v1.part02.b64",
      "assets/project-media/alrajhi-tanks-v1.part03.b64",
    ],
    partLengths: [16800, 16800, 16800, 16760],
    output: "images/projects/alrajhi-tanks-king-salman-park-01.webp",
  },
  {
    sources: [
      "assets/project-media/faisaliah-villa-v2.part00.hex",
      "assets/project-media/faisaliah-villa-v2.part01.hex",
      "assets/project-media/faisaliah-villa-v2.part02.hex",
      "assets/project-media/faisaliah-villa-v2.part03.hex",
      "assets/project-media/faisaliah-villa-v2.part04.hex",
      "assets/project-media/faisaliah-villa-v2.part05.hex",
      "assets/project-media/faisaliah-villa-v2.part06.hex",
      "assets/project-media/faisaliah-villa-v2.part07.hex",
      "assets/project-media/faisaliah-villa-v2.part08.hex",
    ],
    partLengths: [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 1244],
    encoding: "hex",
    output: "images/projects/faisaliah-villa-facades-finishing-01.webp",
  },
  {
    sources: [
      "assets/project-media/villa-uhud-finishing-v1.part00.b64",
      "assets/project-media/villa-uhud-finishing-v1.part01.b64",
      "assets/project-media/villa-uhud-finishing-v1.part02.b64",
      "assets/project-media/villa-uhud-finishing-v1.part03.b64",
      "assets/project-media/villa-uhud-finishing-v1.part04.b64",
      "assets/project-media/villa-uhud-finishing-v1.part05.b64",
      "assets/project-media/villa-uhud-finishing-v1.part06.b64",
    ],
    partLengths: [16800, 16800, 16800, 16800, 16800, 16800, 2880],
    output: "images/projects/villa-plaster-ceramic-marble-uhud-riyadh-01.webp",
  },
];

for (const page of generatedProjectPages) {
  for (const relativePath of page.sources) {
    if (!existsSync(join(root, relativePath))) {
      throw new Error(`Missing generated project page part: ${relativePath}`);
    }
  }

  const html = page.sources
    .map((relativePath) => readFileSync(join(root, relativePath), "utf8"))
    .join("");
  if (!html.startsWith("<!DOCTYPE html>") || !html.endsWith("</html>")) {
    throw new Error(`Invalid generated project page: ${page.output}`);
  }
  writeFileSync(join(root, page.output), html);
}

for (const image of encodedProjectImages) {
  for (const relativePath of image.sources) {
    if (!existsSync(join(root, relativePath))) {
      throw new Error(`Missing encoded project image part: ${relativePath}`);
    }
  }

  const encoded = image.sources
    .map((relativePath, index) => {
      const part = readFileSync(join(root, relativePath), "utf8").trim();
      const expectedLength = image.partLengths?.[index];
      if (expectedLength === undefined) return part;
      if (part.length < expectedLength) {
        throw new Error(
          `Truncated encoded project image part: ${relativePath}; expected=${expectedLength}, actual=${part.length}`,
        );
      }
      return part.slice(0, expectedLength);
    })
    .join("");
  const bytes = Buffer.from(encoded, image.encoding || "base64");
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

for (const privateAssetDirectory of [
  "assets/project-media",
  "assets/project-pages",
]) {
  rmSync(join(publicDirectory, privateAssetDirectory), {
    recursive: true,
    force: true,
  });
}

for (const relativePath of files) {
  const source = join(root, relativePath);
  if (!existsSync(source)) {
    throw new Error(`Missing static file: ${relativePath}`);
  }
  cpSync(source, join(publicDirectory, relativePath));
}

console.log(
  `Prepared ${directories.length} directories, ${files.length} root files, ${generatedProjectPages.length} generated project page, and ${encodedProjectImages.length} validated project images for Next.js.`,
);
