import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export async function verifyMaintenanceImages(root, outputDirectory) {
  const directory = 'maintenance/assets/images';
  const assets = JSON.parse(readFileSync(join(root, 'data/maintenance-photo-assets.json'), 'utf8')).images;
  const expected = new Map();
  for (const asset of Object.values(assets)) {
    expected.set(asset.file, { width: asset.width, height: asset.height });
    for (const candidate of asset.srcset.split(',')) {
      const [url, descriptor] = candidate.trim().split(/\s+/);
      const file = new URL(url, 'https://tawodco.com').pathname.split('/').pop();
      if (!/^\d+w$/.test(descriptor)) throw new Error(`Invalid image width descriptor: ${candidate}`);
      const dimensions = expected.get(file) || {};
      expected.set(file, { ...dimensions, width: Number(descriptor.slice(0, -1)) });
    }
  }

  const files = new Set([
    ...readdirSync(join(root, directory)).filter(file => /\.(webp|avif)$/i.test(file)),
    ...expected.keys(),
  ]);
  for (const file of files) {
    const path = join(directory, file);
    try {
      const bytes = readFileSync(join(root, path));
      if (!bytes.length) throw new Error('image file is empty');
      const image = sharp(bytes, { failOn: 'warning' });
      const metadata = await image.metadata();
      const dimensions = expected.get(file);
      for (const key of ['width', 'height']) {
        if (dimensions?.[key] && metadata[key] !== dimensions[key]) {
          throw new Error(`${key} is ${metadata[key]}, expected ${dimensions[key]}`);
        }
      }
      await image.raw().toBuffer();
      if (outputDirectory && !bytes.equals(readFileSync(join(outputDirectory, path)))) {
        throw new Error('exported image differs from the validated source');
      }
    } catch (error) {
      throw new Error(`${path}: ${error.message}`, { cause: error });
    }
  }
  console.log(`Verified ${files.size} maintenance images: decoding, responsive dimensions, and${outputDirectory ? ' export parity' : ' source files'}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await verifyMaintenanceImages(resolve(process.argv[2] || '.'));
}
