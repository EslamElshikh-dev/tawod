import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { buildVillaModel, disposeModel } from '../lib/villa-3d/models.mjs';
import { buildProjectModel } from '../lib/villa-3d/project-models.mjs';
import { projectExperiences, enhanceArabicProject, renderVilla3D } from './villa-experience.mjs';
import { collectFaces, createSoftwareRenderer, rasterizeTriangle } from '../lib/villa-3d/software-renderer.mjs';

for (const [variant, details] of [['interior', ['living', 'kitchen', 'terrace']], ['entrance', ['entrance', 'columns', 'garden']], ['faisaliah', ['facade','cornice','living']], ['uhud', ['facade','grooves','living']]]) {
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
  test(`${variant}: the complete exterior and both furnished cutaways stay distinct and inexpensive`, () => {
    const model = buildVillaModel(variant);
    let exteriorCount;
    for (const mode of ['exterior', 'ground', 'upper', 'exterior']) {
      model.setMode(mode); const faces = collectFaces(model.group), tags = new Set(); let visibleMeshes = 0;
      model.group.traverseVisible(object => { if (object.isMesh) { visibleMeshes++; tags.add(object.userData.detail); } });
      assert.ok(visibleMeshes < 110, `Active mesh budget exceeded: ${visibleMeshes}`);
      assert.ok(faces.length > 3000 && faces.length < 24000);
      if (mode === 'exterior') { assert.ok(tags.has('terrace')); assert.ok(!tags.has('bedrooms')); exteriorCount ??= faces.length; assert.equal(faces.length, exteriorCount); }
      if (mode === 'ground') { assert.ok(tags.has('kitchen') && tags.has('living') && tags.has('stairs')); assert.ok(!tags.has('bedrooms')); assert.ok(!model.parts.roof.visible && !model.parts.upperShell.visible); }
      if (mode === 'upper') { assert.ok(tags.has('bedrooms') && tags.has('bathrooms') && tags.has('stairs')); assert.ok(!tags.has('kitchen')); assert.ok(model.parts.lowerShell.visible && !model.parts.roof.visible); }
    }
    assert.throws(() => model.setMode('missing'), /Unknown villa display mode/);
    disposeModel(model.group);
  });
  test(`${variant}: all four facades have visible glazing and the foundation supports the raised floor`, () => {
    const model = buildVillaModel(variant), objects = [];
    model.group.updateMatrixWorld(true); model.group.traverseVisible(o => { if (o.isMesh) objects.push(o); });
    const y = variant === 'entrance' ? 3.1 : 2.516;
    for (const [origin, direction] of [[[-2.5, y, 11], [0, 0, -1]], [[12, y, -5.1], [-1, 0, 0]], [[-12, y, -4.6], [1, 0, 0]], [[.3, y, -15], [0, 0, 1]]]) {
      const hit = new THREE.Raycaster(new THREE.Vector3(...origin), new THREE.Vector3(...direction)).intersectObjects(objects, false)[0];
      assert.ok(hit?.object.material.userData.windowGlow, `A facade opening is obscured at ${origin}`);
    }
    const foundation = new THREE.Raycaster(new THREE.Vector3(5, .2, -6), new THREE.Vector3(-1, 0, 0)).intersectObjects(objects, false)[0];
    assert.ok(foundation && Math.abs(foundation.point.x - 4.3) < .02, 'The raised villa must not float above an empty foundation');
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

for (const [variant, modes] of [['arouba',['exterior','mosque','villas']], ['warehouses',['exterior','structure','foundations']], ['tanks',['exterior','reinforcement','waterproofing']]]) {
  test(`${variant}: distinct layers, bounded geometry and every advertised camera are available`, () => {
    const model = buildProjectModel(variant), counts = [];
    for (const mode of modes) {
      model.setMode(mode); model.group.updateMatrixWorld(true);
      const faces = collectFaces(model.group); counts.push(faces.length);
      assert.ok(faces.length > 300 && faces.length < 18000);
      assert.ok(faces.every(face=>face.vertices.every(Number.isFinite)));
      let meshes = 0; model.group.traverseVisible(object=>{if(object.isMesh) meshes++;});
      assert.ok(meshes < 100, `Active draw objects: ${meshes}`);
    }
    assert.equal(new Set(counts).size, 3, 'Layer switches must change the rendered scene');
    assert.throws(()=>model.setMode('ground'), /Unknown project display mode/);
    const data = projectExperiences[variant];
    for (const id of [...modes,...data.ar.map(detail=>detail[0]),'general','front','rear','top']) {
      const view = model.presets[id === 'exterior' ? 'general' : id]; assert.ok(view, `Missing view: ${id}`);
      const distance = new THREE.Vector3(...view.position).distanceTo(new THREE.Vector3(...view.target));
      assert.ok(Number.isFinite(distance) && distance >= model.minDistance && distance <= model.maxDistance);
      assert.ok(modes.includes(view.mode));
    }
    model.setLighting(true); model.setLighting(false); disposeModel(model.group);
  });
}
test('the industrial and mixed-use models retain the published component counts', () => {
  const warehouse = buildProjectModel('warehouses'), arouba = buildProjectModel('arouba');
  assert.equal(warehouse.group.userData.warehouseUnits.length,8);
  assert.equal(new Set(warehouse.group.userData.warehouseUnits.map(unit=>`${unit.x},${unit.z}`)).size,8);
  assert.deepEqual(arouba.group.userData.components,['mosque','villa-1','villa-2']);
  warehouse.setMode('foundations'); assert.equal(warehouse.parts.frames.visible,false); assert.equal(warehouse.parts.cladding.visible,false);
  arouba.setMode('mosque'); assert.equal(arouba.parts.mosqueRoof.visible,false); assert.equal(arouba.parts.prayer.visible,true);
  arouba.setMode('villas'); assert.equal(arouba.parts.villaRoofs.visible,false); assert.equal(arouba.parts.villaUpper.visible,false); assert.equal(arouba.parts.villaInterior.visible,true);
  disposeModel(warehouse.group); disposeModel(arouba.group);
});
test('tank layers expose reinforcement and membrane without an opaque cover', () => {
  const model = buildProjectModel('tanks');
  for (const [mode,tag] of [['reinforcement','rebar'],['waterproofing','waterproofing']]) {
    model.setMode(mode); const tags = new Set(); model.group.traverseVisible(object=>{if(object.isMesh)tags.add(object.userData.detail);});
    assert.ok(tags.has(tag)); assert.equal(model.parts.lid.visible,false); assert.equal(model.parts.walls.visible,false);
  }
  model.group.updateMatrixWorld(true);
  const visible = []; model.group.traverseVisible(object=>{if(object.isMesh)visible.push(object);});
  const hit = new THREE.Raycaster(new THREE.Vector3(0,8,0),new THREE.Vector3(0,-1,0)).intersectObjects(visible,false)[0];
  assert.equal(hit?.object.userData.detail,'waterproofing','The earth surface must leave the excavation open');
  disposeModel(model.group);
});
test('all project controls resolve to model views in both languages and Arabic regeneration is stable', () => {
  for (const [variant,data] of Object.entries(projectExperiences)) {
    const model = buildProjectModel(variant);
    for (const lang of ['ar','en']) {
      const html = renderVilla3D(variant,lang);
      for (const match of html.matchAll(/data-3d-(?:mode|preset|detail)="([^"]+)"/g)) assert.ok(model.presets[match[1] === 'exterior' ? 'general' : match[1]],`${variant}: ${match[1]}`);
      assert.doesNotMatch(html,/villa-3d-note|لا توثّق أبعاد|الأجزاء غير الظاهرة/);
      assert.ok(fs.existsSync(data.poster.slice(1)));
    }
    if (data.summary) {
      const source = fs.readFileSync(data.file,'utf8'), enhanced = enhanceArabicProject(source,variant);
      assert.equal(enhanced,source,`${variant}: enhancer must be repeatable`);
      for (const id of ['project-overview','project-photo','project-3d','project-facts']) assert.equal([...source.matchAll(new RegExp(`id="${id}"`,'g'))].length,1,`${variant}: duplicate or missing ${id}`);
    }
    disposeModel(model.group);
  }
});
test('unknown model identifiers cannot create a misleading blank model', () => {
  assert.throws(() => buildVillaModel('unknown'), /Unknown villa illustration/);
});
test('software rendering preserves instanced balcony placement and wall cutouts', () => {
  const model = buildVillaModel('entrance'), faces = collectFaces(model.group);
  assert.ok(faces.length > 13000 && faces.length < 24000);
  assert.ok(faces.every(face => face.vertices.every(Number.isFinite)));
  const balusters = faces.filter(face => face.center.y > 6.3 && face.center.y < 7.2 && face.center.z > .5);
  assert.ok(balusters.some(face => face.center.x < -1));
  assert.ok(balusters.some(face => face.center.x > 1));
  for (const x of [.32, 3.2]) {
    const visible = []; model.group.traverseVisible(object => { if (object.isMesh) visible.push(object); });
    const ray = new THREE.Raycaster(new THREE.Vector3(x, 3.1, 10), new THREE.Vector3(0, 0, -1));
    const nearest = ray.intersectObjects(visible, false)[0];
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
    const exterior = rendered.data.slice();
    model.setMode('ground'); renderer.invalidateScene(); renderer.render(scene, camera);
    assert.ok(rendered.data.some((value, index) => value !== exterior[index]), 'The fallback must remove the hidden exterior when a floor is opened');
    model.setMode('upper'); renderer.invalidateScene(); renderer.render(scene, camera);
  } finally { renderer?.dispose(); disposeModel(scene); globalThis.document = previousDocument; }
});
