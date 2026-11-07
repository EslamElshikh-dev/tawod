import * as THREE from 'three';
import { palette, mesh, box, cylinder, group, optimizePart } from './primitives.mjs';
import { buildFinishingFacade } from './finishing-facades.mjs';
import { buildPhotoRoom, buildPhotoEntrance } from './photo-details.mjs';

// The complete buildings, floor layouts and landscape are architectural concepts,
// not surveyed project geometry. The original photographs remain the evidence.
function apertureWall(parent, width, height, depth, openings, at, rotation, m, tag = 'walls') {
  const shape = new THREE.Shape(); shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0); shape.lineTo(width / 2, height); shape.lineTo(-width / 2, height); shape.closePath();
  for (const [x, y, w, h] of openings) {
    const hole = new THREE.Path(); hole.moveTo(x - w / 2, y - h / 2); hole.lineTo(x - w / 2, y + h / 2); hole.lineTo(x + w / 2, y + h / 2); hole.lineTo(x + w / 2, y - h / 2); hole.closePath(); shape.holes.push(hole);
  }
  const wall = mesh(parent, new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), m, at, tag); wall.rotation.y = rotation; return wall;
}
function windowUnit(parent, x, y, width, height, z, m, classic = false, tag = 'walls') {
  box(parent, [width, height, .06], [x, y, z], m.glass, tag);
  const trim = classic ? .11 : .075;
  for (const sign of [-1, 1]) {
    box(parent, [width + trim * 2, trim, .16], [x, y + sign * height / 2, z + .05], classic ? m.white : m.dark, tag);
    box(parent, [trim, height, .16], [x + sign * width / 2, y, z + .05], classic ? m.white : m.dark, tag);
  }
  box(parent, [.035, height, .11], [x, y, z + .06], m.dark, tag);
  if (classic) box(parent, [width, .035, .11], [x, y + .15, z + .06], m.dark, tag);
}
function storeyEnvelope(parent, base, height, m, classic, front = true) {
  for (const side of [-1, 1]) {
    const wall = group(parent, `side-${side}`); wall.position.set(side * 4.3, base, -4.85); wall.rotation.y = side * Math.PI / 2;
    const holes = [-2.5, 0, 2.5].map(x => [x, height * .56, 1.3, 1.85]);
    apertureWall(wall, 8.3, height, .19, holes, [0, 0, -.095], 0, m.stone);
    for (const [x, y, w, h] of holes) windowUnit(wall, x, y, w, h, .04, m, classic);
    if (classic) for (const x of [-3.95, 3.95]) box(wall, [.15, height, .18], [x, height / 2, .13], m.white, 'columns');
  }
  const rear = group(parent, 'rear'); rear.position.set(0, base, -9); rear.rotation.y = Math.PI;
  const holes = [-2.7, 0, 2.7].map(x => [x, height * .56, x === 0 ? 1.65 : 1.35, 1.85]);
  apertureWall(rear, 8.6, height, .19, holes, [0, 0, -.095], 0, m.stone);
  for (const [x, y, w, h] of holes) windowUnit(rear, x, y, w, h, .04, m, classic);
  if (front) {
    const facade = group(parent, 'front'); facade.position.set(0, base, -.7);
    const openings = [[-2.75, height * .56, 1.8, 1.9], [2.75, height * .56, 1.4, 1.9], [0, 1.48, 1.3, 2.78]];
    apertureWall(facade, 8.6, height, .22, openings, [0, 0, -.11], 0, m.stone, 'entrance');
    for (const [x, y, w, h] of openings) windowUnit(facade, x, y, w, h, .055, m, classic, 'entrance');
    for (const x of [-.12, .12]) box(facade, [.035, .5, .08], [x, 1.55, .2], m.gold, 'entrance');
  }
  const band = classic ? m.white : m.dark;
  for (const z of [-.58, -9.05]) box(parent, [8.96, .14, .3], [0, base + height - .05, z], band, 'terrace');
  for (const x of [-4.38, 4.38]) box(parent, [.3, .14, 8.6], [x, base + height - .05, -4.85], band, 'terrace');
}
function slab(parent, y, m, withStairwell = false) {
  const shape = new THREE.Shape(); shape.moveTo(-4.3, .7); shape.lineTo(4.3, .7); shape.lineTo(4.3, 9); shape.lineTo(-4.3, 9); shape.closePath();
  if (withStairwell) {
    const hole = new THREE.Path(); hole.moveTo(1.9, 1.05); hole.lineTo(1.9, 4.25); hole.lineTo(3.6, 4.25); hole.lineTo(3.6, 1.05); hole.closePath(); shape.holes.push(hole);
  }
  const floor = mesh(parent, new THREE.ExtrudeGeometry(shape, { depth: .18, bevelEnabled: false }), m, [0, y - .18, 0], 'floor'); floor.rotation.x = -Math.PI / 2;
}
function lowWalls(parent, y, m) {
  for (const x of [-4.25, 4.25]) box(parent, [.13, 1.05, 8.2], [x, y + .525, -4.85], m.wall, 'walls');
  for (const z of [-.75, -8.95]) box(parent, [8.4, 1.05, .13], [0, y + .525, z], m.wall, 'walls');
  for (const x of [-4.15, 4.15]) box(parent, [.035, .08, 8.1], [x, y + .08, -4.85], m.white, 'floor');
}
function sofa(parent, x, y, z, angle, m, width = 2.2) {
  const seating = group(parent, 'seating'); seating.position.set(x, y, z); seating.rotation.y = angle;
  box(seating, [width, .24, .83], [0, .25, 0], m.wood, 'living');
  box(seating, [width - .12, .18, .75], [0, .46, .02], m.fabric, 'living');
  box(seating, [width, .56, .16], [0, .68, -.38], m.linen, 'living');
  for (const sign of [-1, 1]) { box(seating, [.17, .43, .83], [sign * (width / 2 - .07), .53, 0], m.linen, 'living'); box(seating, [.36, .32, .14], [sign * width / 3, .7, -.22], m.rug, 'living'); }
}
function table(parent, x, y, z, m, dining = false) {
  box(parent, [dining ? 1.65 : 1.3, .09, dining ? .9 : .7], [x, y + (dining ? .77 : .43), z], m.wood, 'living');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(parent, [.05, dining ? .72 : .38, .05], [x + sx * (dining ? .69 : .5), y + (dining ? .36 : .19), z + sz * .27], m.dark, 'living');
}
function chair(parent, x, y, z, angle, m) {
  const value = group(parent, 'chair'); value.position.set(x, y, z); value.rotation.y = angle;
  box(value, [.46, .11, .46], [0, .45, 0], m.fabric, 'living'); box(value, [.46, .5, .08], [0, .72, -.21], m.wood, 'living');
  for (const dx of [-.16, .16]) for (const dz of [-.16, .16]) box(value, [.04, .4, .04], [dx, .2, dz], m.wood, 'living');
}
function bed(parent, x, y, z, m, single = false) {
  const w = single ? 1.05 : 1.6;
  box(parent, [w + .12, .3, 2.12], [x, y + .23, z], m.wood, 'bedrooms');
  box(parent, [w, .25, 2], [x, y + .5, z], m.linen, 'bedrooms');
  box(parent, [w + .15, .95, .11], [x, y + .6, z - 1.07], m.fabric, 'bedrooms');
  box(parent, [w + .02, .06, .68], [x, y + .66, z + .53], m.rug, 'bedrooms');
  for (const dx of single ? [0] : [-.39, .39]) box(parent, [single ? .7 : .57, .13, .38], [x + dx, y + .68, z - .66], m.white, 'bedrooms');
  box(parent, [.42, .51, .42], [x - w / 2 - .36, y + .27, z - .67], m.wood, 'bedrooms');
  cylinder(parent, .105, .13, [x - w / 2 - .36, y + .6, z - .67], m.warm, 'lighting');
}
function bathroom(parent, x, y, z, m) {
  box(parent, [1.9, .035, 2.45], [x, y + .02, z], m.paving, 'bathrooms');
  box(parent, [1.4, .38, .68], [x, y + .24, z - .72], m.white, 'bathrooms'); box(parent, [1.15, .03, .46], [x, y + .45, z - .72], m.water, 'bathrooms');
  box(parent, [.55, .63, .44], [x - .56, y + .34, z + .72], m.wood, 'bathrooms'); cylinder(parent, .22, .1, [x - .56, y + .71, z + .72], m.white, 'bathrooms');
  box(parent, [.41, .36, .62], [x + .55, y + .23, z + .63], m.white, 'bathrooms'); box(parent, [.4, .51, .17], [x + .55, y + .42, z + .33], m.white, 'bathrooms');
}
function stairs(parent, base, rise, m) {
  for (let n = 0; n < 16; n++) box(parent, [1.32, .11, .205], [2.75, base + rise * (n + 1) / 16, -.93 - n * .2], m.white, 'stairs');
  for (let n = 0; n < 6; n++) box(parent, [.045, .8, .045], [3.45, base + rise * n / 5 + .45, -.93 - n * .6], m.gold, 'stairs');
  const rail = box(parent, [.05, .06, Math.hypot(rise, 3)], [3.45, base + rise / 2 + .9, -2.43], m.gold, 'stairs'); rail.rotation.x = Math.atan2(rise, 3);
}
function groundInterior(parent, base, rise, m, classic) {
  lowWalls(parent, base, m);
  const photo = buildPhotoRoom({ passage: true }); photo.group.scale.setScalar(.78); photo.group.position.set(-1.05, base + .03, -3.05); parent.add(photo.group);
  box(parent, [2.75, .025, 2.1], [-1.65, base + .09, -2.5], m.rug, 'living');
  sofa(parent, -1.65, base + .1, -1.95, Math.PI, m, 2.5); sofa(parent, -.05, base + .1, -3.2, -Math.PI / 2, m, 1.7);
  table(parent, -1.5, base + .1, -3.2, m);
  box(parent, [1.9, .9, .09], [-1.75, base + 1.7, -5.16], m.dark, 'living'); box(parent, [2.4, .44, .42], [-1.75, base + .36, -4.95], m.wood, 'living');
  // An illustrative service zone, with open circulation around the stairs.
  for (const [size, at] of [[[.58, .82, 3], [3.85, base + .41, -6.9]], [[2.9, .82, .6], [2.7, base + .41, -8.55]]]) {
    box(parent, size, at, m.wood, 'kitchen'); box(parent, [size[0] + .05, .07, size[2] + .05], [at[0], base + .86, at[2]], m.white, 'kitchen');
  }
  box(parent, [.45, .035, .65], [3.85, base + .91, -6.85], m.dark, 'kitchen');
  for (const dz of [-.18, .18]) for (const dx of [-.1, .1]) cylinder(parent, .065, .018, [3.85 + dx, base + .94, -6.85 + dz], m.gold, 'kitchen', 8);
  box(parent, [.52, .035, .4], [2.2, base + .91, -8.55], m.water, 'kitchen');
  box(parent, [.8, 1.85, .7], [3.78, base + .925, -5.15], m.dark, 'kitchen');
  table(parent, .2, base + .05, -7.05, m, true);
  for (const dz of [-.82, .82]) for (const dx of [-.5, .5]) chair(parent, .2 + dx, base + .05, -7.05 + dz, dz < 0 ? 0 : Math.PI, m);
  box(parent, [1.35, 1.15, .12], [-3.55, base + .575, -5.65], m.wall, 'walls');
  box(parent, [.12, 1.15, 3.2], [-1.85, base + .575, -7.35], m.wall, 'walls'); bathroom(parent, -3.05, base + .04, -7.3, m);
  if (classic) cylinder(parent, .24, .08, [-1.5, base + .55, -3.2], m.gold, 'living');
}
function upperInterior(parent, base, m) {
  lowWalls(parent, base, m);
  for (const x of [-1.2, 1.2]) { box(parent, [.12, 1.12, 4], [x, base + .56, -6.9], m.wall, 'walls'); box(parent, [.12, 1.12, 1.8], [x, base + .56, -1.65], m.wall, 'walls'); }
  for (const x of [-3.25, 3.25]) box(parent, [1.9, 1.12, .12], [x, base + .56, -4.75], m.wall, 'walls');
  for (const x of [-.85, .85]) box(parent, [.65, 1.12, .12], [x, base + .56, -5.8], m.wall, 'walls');
  bed(parent, -2.75, base + .05, -7.1, m); bed(parent, 2.75, base + .05, -7.1, m, true);
  for (const x of [-3.3, -2.2, 2.7]) box(parent, [.83, 1.18, .5], [x, base + .59, -8.65], m.wood, 'bedrooms');
  bathroom(parent, 0, base + .05, -7.25, m);
  box(parent, [2.65, .03, 2.7], [-2.75, base + .05, -2.5], m.rug, 'living');
  sofa(parent, -3.35, base + .08, -2.7, Math.PI / 2, m, 2.2); table(parent, -2.3, base + .08, -2.7, m);
  box(parent, [1.85, .035, 1.2], [-.1, base + .05, -2.45], m.paving, 'stairs');
  // Railings leave the actual stair opening clear in the upper floor slab.
  for (const x of [1.85, 3.65]) {
    box(parent, [.045, .045, 3.25], [x, base + .85, -2.65], m.gold, 'stairs');
    for (const z of [-1.1, -2.65, -4.2]) box(parent, [.04, .85, .04], [x, base + .425, z], m.dark, 'stairs');
  }
}
function palm(parent, x, z, height, m) {
  cylinder(parent, .13, height, [x, height / 2 + .15, z], m.wood, 'garden', 9);
  for (let n = 0; n < 8; n++) {
    const vertices = [], uvs = [];
    for (let i = 0; i < 4; i++) {
      const sample = (step, side) => { const t = step / 4; return [t * 1.55, .42 * t - .75 * t * t, side * .22 * Math.sin(Math.PI * t)]; };
      const a = sample(i, -1), b = sample(i + 1, -1), c = sample(i + 1, 1), d = sample(i, 1);
      vertices.push(...a, ...b, ...c, ...a, ...c, ...d); uvs.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.computeVertexNormals();
    const leaf = mesh(parent, geometry, m.leaf, [x, height + .15, z], 'garden'); leaf.rotation.y = n / 8 * Math.PI * 2; leaf.rotation.z = (n % 2) * .12;
  }
}
function landscape(parent, m, classic) {
  box(parent, [16.6, .32, 21.4], [0, -.17, -1.6], m.base, 'garden');
  box(parent, [16.2, .07, 21], [0, .015, -1.6], m.paving, 'garden');
  for (const side of [-1, 1]) {
    box(parent, [.18, 1.15, 20.7], [side * 8.05, .58, -1.6], m.stone, 'garden');
    box(parent, [.25, .1, 20.7], [side * 8.05, 1.2, -1.6], m.white, 'garden');
    for (const z of [-10.5, 5.6]) { box(parent, [2.3, .38, 2.25], [side * 6.35, .22, z], m.stone, 'garden'); box(parent, [2.05, .04, 2], [side * 6.35, .43, z], m.soil, 'garden'); palm(parent, side * 6.35, z, z < 0 ? 3.6 : 3.1, m); }
    box(parent, [2.3, .07, 7.7], [side * 6.3, .08, -4.8], m.lawn, 'garden');
    for (const z of [-7.4, -3.8, .1, 6.5]) { cylinder(parent, .075, .65, [side * 5.0, .34, z], m.dark, 'lighting', 8); cylinder(parent, .085, .11, [side * 5.0, .68, z], m.warm, 'lighting', 8); }
  }
  box(parent, [16.2, 1.15, .18], [0, .58, -12], m.stone, 'garden');
  for (const [w, x] of [[1.65, -7.25], [3.3, .05], [3.4, 6.45]]) box(parent, [w, 1.15, .18], [x, .58, 8.8], m.stone, 'garden');
  for (const x of [-6.25, -2.55, 1.7, 4.55]) { box(parent, [.23, 1.9, .3], [x, .95, 8.8], m.stone, 'garden'); box(parent, [.3, .08, .35], [x, 1.95, 8.8], m.warm, 'lighting'); }
  for (const [x, width] of [[-4.4, 3.55], [3.1, 2.65]]) {
    box(parent, [width, 1.5, .09], [x, .8, 8.85], m.dark, 'garden');
    for (let dx = -width / 2 + .17; dx < width / 2; dx += .22) box(parent, [.035, 1.4, .11], [x + dx, .82, 8.92], classic ? m.gold : m.wood, 'garden');
  }
  for (let z = 3.6; z < 8.3; z += .9) box(parent, [2.1, .055, .72], [.25, .09, z], m.white, 'entrance');
  // Side pergola, a rear terrace, and planting complete the property illustration.
  for (const x of [-7.5, -3.65]) for (const z of [1.15, 5.7]) box(parent, [.14, 2.9, .14], [x, 1.45, z], m.dark, 'garden');
  for (let z = 1; z <= 5.85; z += .42) box(parent, [4.12, .12, .14], [-5.58, 2.98, z], classic ? m.white : m.wood, 'garden');
  box(parent, [6.4, .13, 1.65], [0, .1, -10.15], m.wood, 'terrace');
  table(parent, -.4, .22, -10.2, m, true); chair(parent, -1.7, .22, -10.2, Math.PI / 2, m); chair(parent, .95, .22, -10.2, -Math.PI / 2, m);
  box(parent, [1.25, .5, 3.4], [6.3, .3, 1.65], m.stone, 'garden'); box(parent, [1.05, .04, 3.1], [6.3, .57, 1.65], m.water, 'garden');
  for (const z of [-.6, 3.7]) { mesh(parent, new THREE.IcosahedronGeometry(.44, 0), m.green, [6.3, .86, z], 'garden'); box(parent, [1.15, .4, 1.05], [6.3, .22, z], m.stone, 'garden'); }
}

export function buildVillaModel(variant) {
  if (!['interior', 'entrance', 'faisaliah', 'uhud'].includes(variant)) throw new Error('Unknown villa illustration');
  const classic = variant === 'entrance', finishing = ['faisaliah', 'uhud'].includes(variant), m = palette(), root = new THREE.Group();
  if (variant === 'uhud') { m.stone.color.set('#a8aaa5'); m.white.color.set('#c0c1b9'); m.wall.color.set('#b7bab1'); m.paving.color.set('#c6b9a3'); }
  if (variant === 'faisaliah') { m.stone.color.set('#e7dbc3'); m.white.color.set('#f4ead8'); m.dark.color.set('#303932'); }
  if (classic) { m.fabric.color.set('#c3b19a'); m.rug.color.set('#b5a58b'); m.wood.color.set('#725641'); }
  root.name = finishing ? `${variant} residential villa` : classic ? 'Complete classical villa concept' : 'Complete contemporary villa concept';
  const base = classic ? .96 : .5, rise = classic ? 4.68 : finishing ? 4.05 : 3.6, upperBase = base + rise, roofY = upperBase + 3.5;
  const parts = Object.fromEntries(['site', 'base', 'lowerShell', 'upperShell', 'front', 'lowerFront', 'roof', 'ground', 'upper', 'stair'].map(name => [name, group(root, name)]));
  landscape(parts.site, m, classic);
  box(parts.base, [8.6, base - .04, 8.3], [0, (base - .04) / 2, -4.85], m.stone, 'floor');
  slab(parts.base, base, m.floor);
  storeyEnvelope(parts.lowerShell, base, rise, m, classic || variant === 'faisaliah', !classic); storeyEnvelope(parts.upperShell, upperBase, 3.5, m, classic || variant === 'faisaliah', !classic);
  slab(parts.upperShell, upperBase, m.floor, true);
  if (classic) {
    const photo = buildPhotoEntrance(); parts.front.add(photo.group);
    const approach = []; photo.group.traverse(object => { if (object.isMesh && object.userData.detail === 'steps') approach.push(object); });
    for (const object of approach) parts.site.attach(object);
    // In the upper cutaway, a closed lower front replaces the tall entrance group.
    const lowerFront = parts.lowerFront;
    apertureWall(lowerFront, 8.6, rise, .2, [[0, 1.7, 2.45, 3.3], [-3, 1.84, 1.42, 2.18], [3, 1.84, 1.42, 2.18]], [0, base, -.7], 0, m.stone, 'entrance');
    for (const x of [-3, 3]) windowUnit(lowerFront, x, base + 1.84, 1.42, 2.18, -.43, m, true, 'entrance');
    windowUnit(lowerFront, 0, base + 1.7, 2.45, 3.3, -.43, m, true, 'entrance');
  } else if (finishing) {
    buildFinishingFacade(parts, m, { variant, base, rise, upperBase, roofY });
  } else {
    for (let i = 0; i < 3; i++) box(parts.site, [3.2, .15, 1.35 - i * .28], [0, .075 + i * .15, .2 - i * .14], m.dark, 'entrance');
    box(parts.front, [3.1, .17, 1.5], [0, base + 3.02, -.08], m.dark, 'entrance');
    for (const x of [-1.7, 1.7]) box(parts.front, [.065, 2.25, .05], [x, base + 1.7, -.51], m.warm, 'lighting');
    box(parts.front, [5.6, .16, 1.3], [-1.2, upperBase + .08, -.15], m.white, 'terrace');
    for (const x of [-3.93, 1.53]) box(parts.front, [.06, .92, 1.3], [x, upperBase + .6, -.15], m.dark, 'terrace');
    box(parts.front, [5.5, .08, .08], [-1.2, upperBase + 1.06, .48], m.dark, 'terrace');
    for (let x = -3.6; x <= 1.3; x += .6) box(parts.front, [.04, .85, .04], [x, upperBase + .6, .48], m.gold, 'terrace');
    for (let x = 1.8; x <= 4; x += .22) box(parts.front, [.07, 3.12, .12], [x, upperBase + 1.65, -.5], m.wood, 'walls');
  }
  slab(parts.roof, roofY + .12, m.white);
  for (const x of [-4.28, 4.28]) box(parts.roof, [.18, .5, 8.4], [x, roofY + .37, -4.85], m.stone, 'terrace');
  for (const z of [-.7, -9]) box(parts.roof, [8.75, .5, .18], [0, roofY + .37, z], m.stone, 'terrace');
  if (classic) for (const z of [-.56, -9.12]) box(parts.roof, [9.1, .13, .34], [0, roofY + .66, z], m.white, 'terrace');
  box(parts.roof, [2.5, 2.2, 3.5], [2.65, roofY + 1.22, -2.6], m.stone, 'terrace'); box(parts.roof, [2.7, .16, 3.7], [2.65, roofY + 2.4, -2.6], m.white, 'terrace');
  box(parts.roof, [.08, 1.9, .85], [1.37, roofY + 1.08, -2.6], m.dark, 'terrace');
  box(parts.roof, [2.1, .48, 2.15], [-2.6, roofY + .39, -6.6], m.dark, 'terrace');
  for (const z of [-7.1, -6.6, -6.1]) box(parts.roof, [1.75, .04, .25], [-2.6, roofY + .65, z], m.base, 'terrace');
  box(parts.roof, [2.4, .08, 3.5], [-2.25, roofY + .19, -3.05], m.wood, 'terrace');
  sofa(parts.roof, -2.25, roofY + .23, -2.3, Math.PI, m, 1.85); table(parts.roof, -2.25, roofY + .23, -3.35, m);
  groundInterior(parts.ground, base, rise, m, classic);
  stairs(parts.stair, base, rise, m);
  slab(parts.upper, upperBase, m.floor, true); upperInterior(parts.upper, upperBase, m);
  for (const part of Object.values(parts)) optimizePart(part);
  const lightMaterials = new Set();
  root.traverse(object => {
    if (object.material?.color?.getHexString() === '243334') { object.material.emissive.set('#ffd69a'); object.material.userData.windowGlow = true; }
    if (object.material?.emissive?.getHex() > 0) lightMaterials.add(object.material);
  });
  m.glass.userData.windowGlow = true;
  let mode = '';
  function setMode(next) {
    if (!['exterior', 'ground', 'upper'].includes(next)) throw new Error('Unknown villa display mode');
    mode = next;
    parts.lowerShell.visible = next !== 'ground'; parts.upperShell.visible = next === 'exterior';
    parts.front.visible = next === 'exterior'; parts.roof.visible = next === 'exterior';
    parts.ground.visible = next === 'ground'; parts.upper.visible = next === 'upper';
    parts.stair.visible = next !== 'exterior';
    parts.lowerFront.visible = classic && next === 'upper';
    return next;
  }
  setMode('exterior');
  const presets = {
    general: { position: [23, 19, 27], target: [0, 2.5, -2], mode: 'exterior' },
    front: { position: [0, 14, 36], target: [0, 3, -2], mode: 'exterior' },
    rear: { position: [-23, 18, -29], target: [0, 2.5, -2], mode: 'exterior' },
    top: { position: [14, 28, 15], target: [0, 1.5, -2], mode: 'exterior' },
    ground: { position: [-9, 24, 8], target: [0, base + .8, -4.5], mode: 'ground' },
    upper: { position: [-9, upperBase + 23, 8], target: [0, upperBase + .8, -4.5], mode: 'upper' },
    living: { position: [-10, base + 12, 10], target: [-1.4, base + 1, -3], mode: 'ground' },
    kitchen: { position: [12, base + 16, 3], target: [1.8, base + .8, -6.5], mode: 'ground' },
    terrace: { position: [17, roofY + 14, 14], target: [0, roofY, -4], mode: 'exterior' },
    garden: { position: [17, 11, 22], target: [2, 1.3, 2], mode: 'exterior' },
    entrance: { position: [7, 6.5, 13], target: [0, 3.5, .2], mode: 'exterior' },
    columns: { position: [9, 9, 15], target: [0, 5.2, -.1], mode: 'exterior' },
  };
  if (finishing) {
    presets.facade = { position: [12, 11, 18], target: [0, 4, -.2], mode: 'exterior' };
    presets.cornice = { position: [10, 14, 13], target: [0, roofY - .3, -1], mode: 'exterior' };
    presets.grooves = { position: [11, 9, 14], target: [1, 3.5, -.5], mode: 'exterior' };
  }
  return { group: root, parts, emissive: m.warm, presets, minDistance: 10, maxDistance: 70, setMode, get mode() { return mode; }, setLighting(night) { for (const mat of lightMaterials) mat.emissiveIntensity = mat.userData.windowGlow ? (night ? .9 : .025) : (night ? 4 : 1.5); } };
}

export function disposeModel(root) {
  const geometry = new Set(), materials = new Set();
  root.traverse(object => { if (object.geometry) geometry.add(object.geometry); for (const mat of [object.material].flat().filter(Boolean)) materials.add(mat); });
  geometry.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
}
