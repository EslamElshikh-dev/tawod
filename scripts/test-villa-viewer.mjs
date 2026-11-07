import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { buildVillaModel, disposeModel } from '../lib/villa-3d/models.mjs';
import { collectFaces, createSoftwareRenderer, rasterizeTriangle } from '../lib/villa-3d/software-renderer.mjs';

for (const [variant, details] of [['interior', ['lighting', 'floor', 'walls']], ['entrance', ['entrance', 'columns', 'steps']]]) {
  test(`${variant}: geometry, cameras and detail views stay finite and within the rendering budget`, () => {
    const model = buildVillaModel(variant), tags = new Set(); let triangles = 0, meshes = 0;
    model.group.updateMatrixWorld(true);
    model.group.traverse(object => {
      assert.ok(object.matrixWorld.elements.every(Number.isFinite));
      if (!object.isMesh) return;
      meshes++; if (object.userData.detail) tags.add(object.userData.detail);
      const position = object.geometry.getAttribute('position');
      assert.ok(position?.count > 0);
      assert.ok(Array.from(position.array).every(Number.isFinite));
      triangles += (object.geometry.index?.count || position.count) / 3 * (object.isInstancedMesh ? object.count : 1);
    });
    const bounds = new THREE.Box3().setFromObject(model.group);
    assert.ok(!bounds.isEmpty()); assert.ok([...bounds.min, ...bounds.max].every(Number.isFinite));
    assert.ok(meshes < 220, `Too many draw objects: ${meshes}`);
    assert.ok(triangles < 80000, `Too many triangles: ${triangles}`);
    for (const detail of details) { assert.ok(tags.has(detail)); assert.ok(model.presets[detail]); }
    for (const preset of Object.values(model.presets)) {
      assert.ok([...preset.position, ...preset.target].every(Number.isFinite));
      const distance = new THREE.Vector3(...preset.position).distanceTo(new THREE.Vector3(...preset.target));
      assert.ok(distance >= model.minDistance && distance <= model.maxDistance, `Camera outside zoom bounds: ${distance}`);
    }
    disposeModel(model.group);
  });
}
test('the lightweight controller imports the renderer on demand and the hashed bundle exists', () => {
  const controller = fs.readFileSync('assets/js/tawod-villa-viewer.js', 'utf8');
  assert.match(controller, /start\.addEventListener\('click', async/);
  const module = controller.match(/import\('([^']+\.mjs)'\)/)?.[1];
  assert.ok(module && fs.existsSync(module.slice(1)));
  assert.doesNotMatch(controller, /class WebGLRenderer|from ['"]three/);
  assert.ok(fs.statSync('assets/js/tawod-villa-viewer.js').size < 15000);
  assert.ok(fs.existsSync('assets/licenses/three-MIT.txt'));
});
test('unknown model identifiers cannot create a misleading blank model', () => {
  assert.throws(() => buildVillaModel('unknown'), /Unknown villa illustration/);
});
test('software rendering preserves instanced balcony placement and wall cutouts', () => {
  const model = buildVillaModel('entrance'), faces = collectFaces(model.group);
  assert.ok(faces.length > 9000 && faces.length < 11000);
  assert.ok(faces.every(face => face.vertices.every(Number.isFinite)));
  const balusters = faces.filter(face => face.center.y > 6.3 && face.center.y < 7.2 && face.center.z > .5);
  assert.ok(balusters.some(face => face.center.x < -1));
  assert.ok(balusters.some(face => face.center.x > 1));
  for (const x of [.32, 3.2]) {
    const ray = new THREE.Raycaster(new THREE.Vector3(x, 3.1, 10), new THREE.Vector3(0, 0, -1));
    const nearest = ray.intersectObject(model.group, true)[0];
    assert.equal(nearest?.object.material.color.getHexString(), '243334', 'Glazing must remain visible through the facade openings');
  }
  disposeModel(model.group);
});
test('software depth buffering hides rear faces independently of drawing order', () => {
  for (const order of [[.7, -.2], [-.2, .7]]) {
    const pixels = new Uint8ClampedArray(8 * 8 * 4), depths = new Float32Array(64).fill(Infinity);
    for (const depth of order) rasterizeTriangle(pixels, depths, 8, 8, [0, 0, depth, 8, 0, depth, 0, 8, depth], depth < 0 ? [25, 50, 75] : [200, 0, 0]);
    assert.deepEqual([...pixels.slice((2 * 8 + 2) * 4, (2 * 8 + 2) * 4 + 4)], [25, 50, 75, 255]);
    assert.ok(Math.abs(depths[18] + .2) < .0001);
  }
});
test('the software fallback renders an actual model frame without a GPU', () => {
  let rendered;
  const previousDocument = globalThis.document;
  const context = { createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData: data => { rendered = data; } };
  globalThis.document = { createElement: () => ({ dataset: {}, getContext: () => context }) };
  const model = buildVillaModel('entrance'), scene = new THREE.Scene(); scene.add(model.group);
  scene.background = new THREE.Color('#e8e6df'); scene.add(new THREE.HemisphereLight('#fff', '#888', 2.5));
  const light = new THREE.DirectionalLight('#fff', 3); light.position.set(-7, 12, 9); scene.add(light);
  const camera = new THREE.PerspectiveCamera(37, 1, .1, 100);
  camera.position.set(...model.presets.general.position); camera.lookAt(...model.presets.general.target);
  let renderer;
  try {
    renderer = createSoftwareRenderer(); renderer.setSize(160, 160); renderer.render(scene, camera);
    const shades = new Set();
    for (let i = 0; i < rendered.data.length; i += 4) shades.add(`${rendered.data[i]},${rendered.data[i + 1]},${rendered.data[i + 2]}`);
    assert.ok(shades.size > 8, `Expected architectural surfaces, received ${shades.size} colors`);
    assert.equal(renderer.domElement.dataset.renderer, 'software');
  } finally { renderer?.dispose(); disposeModel(scene); globalThis.document = previousDocument; }
});
