import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.TAWOD_PLAYWRIGHT_MODULE || 'playwright');

// Exercise the real static export in a browser; external requests are blocked.
const output = resolve('out');
const evidence = resolve('artifacts/next-export-browser');
await mkdir(evidence, { recursive: true });
const origin = 'http://127.0.0.1:4173';
for (let attempt = 0; attempt < 30; attempt++) {
  try {
    const ready = await fetch(origin, { method: 'HEAD', signal: AbortSignal.timeout(1000) });
    if (ready.ok) break;
    throw new Error(`Static server returned ${ready.status}`);
  } catch (error) {
    if (attempt === 29) throw error;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
const projects = [];
for (const file of await readdir(output)) {
  if (file.startsWith('project-') && file.endsWith('.html') && (await readFile(resolve(output, file), 'utf8')).includes('data-villa-viewer')) projects.push('/' + file);
}
assert.equal(projects.length, 7, 'All seven project experiences must be exported');
const pages = ['/', '/service-construction.html', '/service-restoration.html', '/maintenance/', '/maintenance/facility-management.html', '/maintenance/building-maintenance-contracts.html', '/maintenance/property-management.html', '/en/', ...projects];
const results = [];
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === origin || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
      return route.abort();
    });
    for (const path of pages) {
      const page = await context.newPage();
      const errors = [], failedLocalResponses = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.url().startsWith(origin) && response.status() >= 400) failedLocalResponses.push({ url: response.url(), status: response.status() }); });
      const response = await page.goto(origin + path, { waitUntil: 'load' });
      assert.equal(response.status(), 200, path);
      await page.locator('h1').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      const shape = await page.evaluate(() => ({ title: document.title, h1: document.querySelector('h1')?.textContent.trim(), dir: document.documentElement.dir, overflow: document.documentElement.scrollWidth > innerWidth + 1, phoneLinks: document.querySelectorAll('a[href^="tel:"]').length, whatsappLinks: document.querySelectorAll('a[href*="wa.me"]').length }));
      assert.ok(shape.title && shape.h1, path + ': title and H1');
      assert.equal(shape.overflow, false, path + ': horizontal overflow');
      assert.ok(shape.phoneLinks > 0 && shape.whatsappLinks > 0, path + ': contact links');
      let viewer;
      if (projects.includes(path)) {
        const root = page.locator('[data-villa-viewer]');
        await root.locator('[data-3d-start]').click();
        await page.waitForFunction(() => ['ready', 'error'].includes(document.querySelector('[data-villa-viewer]')?.dataset.state), null, { timeout: 30000 });
        assert.equal(await root.getAttribute('data-state'), 'ready', path + ': renderer ready');
        assert.equal(await root.locator('canvas').count(), 1, path + ': rendered canvas');
        const night = root.locator('[data-3d-light="night"]');
        await night.click();
        assert.equal(await root.getAttribute('data-lighting'), 'night');
        await root.locator('[data-3d-action="fullscreen"]').click();
        assert.equal(await root.getAttribute('data-expanded'), 'true');
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.querySelector('[data-villa-viewer]')?.dataset.expanded === 'false');
        viewer = await root.evaluate(node => ({ state: node.dataset.state, model: node.dataset.model, renderer: node.dataset.renderer, lighting: node.dataset.lighting }));
      }
      assert.deepEqual(errors, [], path + ': JavaScript errors');
      assert.deepEqual(failedLocalResponses, [], path + ': failed local resources');
      results.push({ path, width, status: response.status(), ...shape, viewer, errors, failedLocalResponses });
      console.log(JSON.stringify({ path, width, passed: true, viewer }));
      if (path === '/' && width === 390) await page.screenshot({ path: resolve(evidence, 'mobile.png'), fullPage: false });
      if (path === projects[0] && width === 1440) await page.screenshot({ path: resolve(evidence, 'project-3d.png'), fullPage: false });
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(resolve(evidence, 'results.json'), JSON.stringify({ browser: 'Playwright 1.55.0 Chromium', externalNetwork: 'blocked', results }, null, 2));
}
console.log(`Verified ${results.length} page/viewport combinations and ${projects.length * 2} real 3D activations.`);
