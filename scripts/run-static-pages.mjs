import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const localSilos = ['dammam', 'khobar', 'dhahran'];
const holdRoot = path.join(root, 'node_modules', '.tawod-local-silos');
const held = [];

fs.mkdirSync(holdRoot, { recursive: true });

try {
  for (const silo of localSilos) {
    const source = path.join(root, silo);
    if (!fs.existsSync(source)) continue;

    const target = path.join(holdRoot, silo);
    fs.rmSync(target, { recursive: true, force: true });
    fs.renameSync(source, target);
    held.push({ source, target });
  }

  const result = spawnSync(
    process.execPath,
    [path.join(root, 'scripts', 'build-static-pages.mjs'), ...process.argv.slice(2)],
    { cwd: root, stdio: 'inherit' }
  );

  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  for (const { source, target } of held.reverse()) {
    if (fs.existsSync(target)) fs.renameSync(target, source);
  }

  try {
    fs.rmdirSync(holdRoot);
  } catch {}
}
