import * as THREE from 'three';
import { palette, material, mesh, box, cylinder, group, optimizePart } from './primitives.mjs';

const preset = (position, target, mode = 'exterior') => ({ position, target, mode });
function beam(parent, a, b, width, depth, mat, tag) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const value = box(parent, [width, start.distanceTo(end), depth], start.clone().add(end).multiplyScalar(.5).toArray(), mat, tag);
  value.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
  return value;
}
function finalize(root, parts, m, modes, presets, settings = {}) {
  for (const part of Object.values(parts)) optimizePart(part);
  let mode;
  function setMode(next) {
    if (!modes[next]) throw new Error('Unknown project display mode');
    mode = next;
    for (const [name, part] of Object.entries(parts)) part.visible = modes[next].includes(name);
    return next;
  }
  setMode('exterior');
  return { group: root, parts, presets, emissive: m.warm, minDistance: 9, maxDistance: 110, ...settings, setMode, get mode() { return mode; }, setLighting(night) { m.warm.emissiveIntensity = night ? 4 : 1.5; m.glass.emissiveIntensity = night ? .8 : .025; } };
}
function makeParts(root, names) { return Object.fromEntries(names.map(name => [name, group(root, name)])); }
function bollard(parent, x, z, m) {
  box(parent, [.13, .55, .13], [x, .4, z], m.dark, 'lighting');
  box(parent, [.16, .1, .16], [x, .71, z], m.warm, 'lighting');
}
function tree(parent, x, z, m) {
  cylinder(parent, .11, 1.5, [x, .85, z], m.wood, 'landscape', 7);
  mesh(parent, new THREE.IcosahedronGeometry(.8, 1), m.green, [x, 2, z], 'landscape');
  box(parent, [1.5, .2, 1.5], [x, .14, z], m.soil, 'landscape');
}
function openingWall(parent, width, height, depth, holes, position, rotation, mat, tag) {
  const shape = new THREE.Shape(); shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0); shape.lineTo(width / 2, height); shape.lineTo(-width / 2, height); shape.closePath();
  for (const [x, y, w, h] of holes) {
    const hole = new THREE.Path(); hole.moveTo(x - w / 2, y - h / 2); hole.lineTo(x - w / 2, y + h / 2); hole.lineTo(x + w / 2, y + h / 2); hole.lineTo(x + w / 2, y - h / 2); hole.closePath(); shape.holes.push(hole);
  }
  const value = mesh(parent, new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), mat, position, tag); value.rotation.y = rotation;
}
function facade(parent, width, height, position, rotation, m, tag, door = false) {
  const wall = group(parent, tag); wall.position.set(...position); wall.rotation.y = rotation;
  const holes = [[-width * .3, height * .58, .95, 1.55], [width * .3, height * .58, .95, 1.55]];
  if (door) holes.push([0, 1.32, 1.2, 2.6]);
  openingWall(wall, width, height, .2, holes, [0, 0, -.1], 0, m.stone, tag);
  for (const [x, y, w, h] of holes) {
    box(wall, [w, h, .05], [x, y, .03], m.glass, tag);
    for (const sign of [-1, 1]) { box(wall, [w + .14, .07, .1], [x, y + sign * h / 2, .08], m.white, tag); box(wall, [.07, h, .1], [x + sign * w / 2, y, .08], m.white, tag); }
    box(wall, [.035, h, .08], [x, y, .09], m.dark, tag);
  }
  box(wall, [width + .25, .18, .38], [0, height, 0], m.white, tag);
}

export function buildAroubaModel() {
  const m = palette(), root = new THREE.Group(); root.name = 'Al Arouba mosque and two villas';
  const p = makeParts(root, ['site', 'mosque', 'mosqueRoof', 'mosqueFront', 'prayer', 'minaret', 'villas', 'villaUpper', 'villaRoofs', 'villaInterior']);
  root.userData.components = ['mosque', 'villa-1', 'villa-2'];
  box(p.site, [33, .35, 29], [0, -.15, 0], m.base, 'site'); box(p.site, [32.6, .08, 28.6], [0, .06, 0], m.paving, 'site');
  for (const x of [-16.3, 16.3]) box(p.site, [.18, 1.2, 28.3], [x, .65, 0], m.stone, 'boundary');
  box(p.site, [32.4, 1.2, .18], [0, .65, -14.2], m.stone, 'boundary');
  for (const x of [-14.5, -1, 14.5]) for (const z of [-12.5, 12.3]) tree(p.site, x, z, m);
  // Three independent volumes, connected by open pedestrian circulation.
  for (let z = -10; z <= 11; z += 2.5) { bollard(p.site, 2, z, m); box(p.site, [2.2, .035, 1.7], [2.3, .13, z], m.white, 'paths'); }
  const hall = group(p.mosque, 'mosque-hall'); hall.position.set(-7, .22, -1.5);
  box(hall, [13, .24, 11], [0, 0, 0], m.floor, 'mosque');
  facade(hall, 13, 5, [0, .12, -5.5], Math.PI, m, 'mosque');
  for (const side of [-1, 1]) facade(hall, 11, 5, [side * 6.5, .12, 0], side * Math.PI / 2, m, 'mosque');
  const front = group(p.mosqueFront, 'mosque-entrance'); front.position.set(-7, .34, 4);
  facade(front, 13, 5, [0, 0, 0], 0, m, 'mosque', true);
  for (const x of [-1.1, 1.1]) box(front, [.2, 4.1, .55], [x, 2.05, .13], m.white, 'entrance');
  box(front, [2.4, .2, .65], [0, 4.15, .15], m.white, 'entrance');
  for (let i = 0; i < 2; i++) box(p.site, [3.2, .11, .9 - .25 * i], [-7, .11 * i + .06, 4.65 - .1 * i], m.white, 'entrance');
  box(p.mosqueRoof, [13.5, .22, 11.5], [-7, 5.52, -1.5], m.white, 'roof');
  for (const z of [-7, 4]) box(p.mosqueRoof, [13.4, .7, .2], [-7, 5.91, z], m.stone, 'roof');
  for (const x of [-13.5, -.5]) box(p.mosqueRoof, [.2, .7, 11.2], [x, 5.91, -1.5], m.stone, 'roof');
  // A slender rectangular tower and stepped crown follow the photograph's silhouette.
  box(p.minaret, [1.35, 10, 1.35], [-12.4, 5.25, -6.4], m.stone, 'minaret');
  for (const y of [6.9, 9.4, 10.3]) box(p.minaret, [1.7, .17, 1.7], [-12.4, y, -6.4], m.white, 'minaret');
  for (const side of [-1, 1]) { box(p.minaret, [.55, 1.2, .04], [-12.4, 8.5, -6.4 + side * .69], m.dark, 'minaret'); box(p.minaret, [.04, 1.2, .55], [-12.4 + side * .69, 8.5, -6.4], m.dark, 'minaret'); }
  cylinder(p.minaret, .04, .8, [-12.4, 10.8, -6.4], m.gold, 'minaret', 8);
  for (let z = -5.7; z <= 2.8; z += 1.2) {
    box(p.prayer, [11.5, .025, .94], [-7, .37, z], m.rug, 'prayer');
    for (let x = -12.5; x < -1.5; x += .85) box(p.prayer, [.025, .015, .75], [x, .39, z], m.linen, 'prayer');
  }
  box(p.prayer, [1.35, 2.5, .2], [-7, 1.6, -6.85], m.gold, 'mihrab'); box(p.prayer, [1.08, 2.18, .22], [-7, 1.53, -6.7], m.dark, 'mihrab');
  for (const x of [-10.3, -3.7]) for (const z of [-3.7, .6]) { cylinder(p.prayer, .15, 4.8, [x, 2.75, z], m.white, 'prayer'); cylinder(p.prayer, .25, .15, [x, .5, z], m.stone, 'prayer'); }
  for (const [index, z] of [[1, -7.4], [2, 5]]) {
    const v = group(p.villas, `villa-${index}`), u = group(p.villaUpper, `villa-${index}-upper`), r = group(p.villaRoofs, `villa-${index}-roof`), inside = group(p.villaInterior, `villa-${index}-interior`);
    for (const part of [v, u, r, inside]) part.position.set(8.5, .3, z);
    box(v, [7.6, .35, 8.5], [0, 0, 0], m.floor, 'villas');
    for (const [part, y] of [[v, .18], [u, 3.68]]) {
      facade(part, 7.6, 3.5, [0, y, 4.25], 0, m, 'villas', part === v);
      facade(part, 7.6, 3.5, [0, y, -4.25], Math.PI, m, 'villas');
      for (const side of [-1, 1]) facade(part, 8.5, 3.5, [side * 3.8, y, 0], side * Math.PI / 2, m, 'villas');
    }
    box(r, [7.9, .2, 8.8], [0, 7.3, 0], m.white, 'roof');
    for (const side of [-1, 1]) { box(r, [7.9, .55, .18], [0, 7.62, side * 4.32], m.stone, 'roof'); box(r, [.18, .55, 8.5], [side * 3.87, 7.62, 0], m.stone, 'roof'); }
    box(inside, [.14, 1.1, 7.9], [0, .73, 0], m.stone, 'villa-layout'); box(inside, [7.3, 1.1, .14], [0, .73, -.5], m.stone, 'villa-layout');
    for (const x of [-2, 2]) { box(inside, [1.6, .44, 2], [x, .55, -2.3], m.linen, 'villa-layout'); box(inside, [1.6, .07, .6], [x, .81, -1.7], m.rug, 'villa-layout'); }
    box(inside, [2.8, .55, .8], [-2, .63, 2.7], m.fabric, 'villa-layout'); box(inside, [1.2, .35, .7], [-2, .46, 1.6], m.wood, 'villa-layout');
    for (const x of [-3.67, 3.67]) box(inside, [.14, 1.1, 8.2], [x, .73, 0], m.stone, 'villa-layout');
    for (const zz of [-4.12, 4.12]) box(inside, [7.3, 1.1, .14], [0, .73, zz], m.stone, 'villa-layout');
  }
  const fixed = ['site', 'mosque', 'prayer', 'minaret', 'villas'];
  return finalize(root, p, m, { exterior: [...fixed, 'mosqueRoof', 'mosqueFront', 'villaUpper', 'villaRoofs'], mosque: [...fixed, 'villaUpper', 'villaRoofs'], villas: [...fixed, 'mosqueRoof', 'mosqueFront', 'villaInterior'] }, {
    general: preset([37, 30, 41], [0, 2, 0]), front: preset([0, 21, 58], [0, 3, 0]), rear: preset([-38, 28, -42], [0, 3, 0]), top: preset([17, 49, 18], [0, 1, 0]),
    mosque: preset([-23, 26, 22], [-7, 1.3, -1.5], 'mosque'), villas: preset([26, 29, 24], [8.5, 1.3, 0], 'villas'),
    minaret: preset([-25, 17, 14], [-10, 5, -3]), prayer: preset([-18, 20, 13], [-7, 1.3, -1.5], 'mosque'), residences: preset([28, 23, 24], [8.5, 1, 0], 'villas'),
  }, { shadowSpan: 28 });
}

export function buildWarehouseModel() {
  const m = palette(), root = new THREE.Group(); root.name = 'Eight industrial warehouse units';
  m.stone.color.set('#e6e3d8'); m.dark.color.set('#384947');
  const steel = material('#e8ece7', { metalness: .5, roughness: .4 }), roof = material('#aab9b3', { metalness: .4, roughness: .5 }), black = material('#303734');
  const p = makeParts(root, ['site', 'foundations', 'frames', 'cladding', 'markings']);
  root.userData.warehouseUnits = [];
  box(p.site, [37, .32, 46], [0, -.13, 0], m.base, 'site'); box(p.site, [36.6, .06, 45.6], [0, .06, 0], m.paving, 'site');
  box(p.site, [6, .035, 43], [0, .11, 0], m.base, 'road');
  for (let z = -20; z <= 21; z += 3) box(p.markings, [.1, .025, 1.2], [0, .14, z], m.white, 'road');
  for (const x of [-17.8, 17.8]) { box(p.site, [.15, 1, 44.8], [x, .58, 0], m.stone, 'boundary'); for (let z = -20; z <= 20; z += 8) bollard(p.site, x - Math.sign(x) * .6, z, m); }
  for (const [column, x] of [[0, -10], [1, 10]]) for (let row = 0; row < 4; row++) {
    const z = -16.3 + row * 10.8, id = column * 4 + row + 1;
    root.userData.warehouseUnits.push({ id, x, z });
    const f = group(p.foundations, `unit-${id}-foundations`), s = group(p.frames, `unit-${id}-steel`), c = group(p.cladding, `unit-${id}-envelope`);
    for (const part of [f, s, c]) part.position.set(x, 0, z);
    box(f, [10.6, .13, 9], [0, .2, 0], m.floor, 'foundations');
    for (const xx of [-5, 5]) {
      box(f, [.28, .35, 9.2], [xx, .32, 0], black, 'waterproofing');
      for (const zz of [-4.1, -2.05, 0, 2.05, 4.1]) {
        box(f, [1.1, .22, 1.1], [xx, .23, zz], m.stone, 'footings'); box(f, [.48, .5, .48], [xx, .54, zz], black, 'waterproofing');
        // White portal frames and dark roof purlins reproduce the structural rhythm.
        box(s, [.14, 4.6, .21], [xx, 2.98, zz], steel, 'structure');
        box(s, [.3, .06, .34], [xx, .73, zz], steel, 'structure');
        beam(s, [xx, 5.28, zz], [0, 6.65, zz], .16, .21, steel, 'structure');
      }
    }
    for (const zz of [-4.1, 4.1]) box(f, [10.3, .35, .28], [0, .32, zz], black, 'waterproofing');
    for (const xx of [-4.8, -2.4, 0, 2.4, 4.8]) box(s, [.09, .12, 8.6], [xx, 6.65 - Math.abs(xx) * .274, 0], m.dark, 'structure');
    for (const xx of [-5, 5]) {
      beam(s, [xx, .8, -4.05], [xx, 5.2, 4.05], .065, .065, m.dark, 'bracing');
      beam(s, [xx, .8, 4.05], [xx, 5.2, -4.05], .065, .065, m.dark, 'bracing');
      box(c, [.1, 4.6, 8.6], [xx, 2.98, 0], m.stone, 'envelope');
      const panel = box(c, [5.27, .1, 8.9], [xx / 2, 5.99, 0], roof, 'roof'); panel.rotation.z = -Math.sign(xx) * Math.atan(.274);
    }
    box(c, [10, 4.6, .1], [0, 2.98, -4.3], m.stone, 'envelope');
    // Front remains open around a large service bay.
    for (const xx of [-3.9, 3.9]) box(c, [2.2, 4.6, .11], [xx, 2.98, 4.3], m.stone, 'envelope');
    box(c, [5.6, .55, .11], [0, 5.02, 4.3], m.stone, 'envelope');
    for (let xx = -4.8; xx <= 4.8; xx += .45) box(c, [.035, 4.5, .025], [xx, 2.98, -4.37], roof, 'envelope');
  }
  return finalize(root, p, m, { exterior: ['site', 'foundations', 'frames', 'cladding', 'markings'], structure: ['site', 'foundations', 'frames', 'markings'], foundations: ['site', 'foundations', 'markings'] }, {
    general: preset([45, 42, 56], [0, 1.7, 0]), front: preset([0, 30, 74], [0, 2, 0]), rear: preset([-45, 40, -56], [0, 2, 0]), top: preset([17, 67, 25], [0, 0, 0]),
    structure: preset([37, 32, 43], [0, 2.7, 0], 'structure'), foundations: preset([34, 45, 33], [0, .2, 0], 'foundations'),
    portal: preset([-1, 17, 31], [-10, 3, 5.3], 'structure'), footings: preset([3, 22, 25], [10, .4, 5.3], 'foundations'), site: preset([36, 50, 42], [0, 1, 0]),
  }, { minDistance: 14, maxDistance: 130, shadowSpan: 35 });
}

export function buildTankModel() {
  const m = palette(), root = new THREE.Group(); root.name = 'King Salman Park tank reinforcement and waterproofing';
  const earth = material('#ab8c68'), earth2 = material('#ba9d78'), concrete = material('#bfc1b4'), rebar = material('#414d49', { metalness: .55 }), membrane = material('#263e3c'), seam = material('#5e8c83');
  const p = makeParts(root, ['site', 'base', 'walls', 'lid', 'reinforcement', 'membrane', 'cutaway']);
  root.userData.structure = 'rectangular excavated tank';
  // Raised earth ring leaves the excavation open all the way to the bottom.
  for (const [size, at] of [[[5, 2.8, 20], [-10, 1.2, 0]], [[5, 2.8, 20], [10, 1.2, 0]], [[15, 2.8, 3.5], [0, 1.2, -8.25]], [[15, 2.8, 3.5], [0, 1.2, 8.25]]]) box(p.site, size, at, earth, 'excavation');
  for (const y of [.3, .85, 1.55, 2.2]) {
    for (const x of [-7.46, 7.46]) box(p.site, [.06, .12, 13], [x, y, 0], earth2, 'excavation');
    for (const z of [-6.46, 6.46]) box(p.site, [15, .12, .06], [0, y, z], earth2, 'excavation');
  }
  box(p.base, [13.6, .22, 11.6], [0, -.02, 0], concrete, 'base');
  box(p.base, [12.5, .25, 10.5], [0, .22, 0], concrete, 'base');
  for (const x of [-6.1, 6.1]) box(p.walls, [.3, 2.7, 10.5], [x, 1.67, 0], concrete, 'concrete');
  for (const z of [-5.1, 5.1]) box(p.walls, [12.5, 2.7, .3], [0, 1.67, z], concrete, 'concrete');
  // A partial cover keeps the tank interior readable in the overall view.
  box(p.lid, [12.5, .22, 3.7], [0, 3.13, -3.3], concrete, 'cover');
  box(p.lid, [1.2, .15, 1.2], [3.2, 3.32, -3.3], m.dark, 'cover');
  for (const y of [.43, .63]) {
    for (let x = -5.75; x <= 5.76; x += .42) box(p.reinforcement, [.035, .035, 9.6], [x, y, 0], rebar, 'rebar');
    for (let z = -4.75; z <= 4.76; z += .42) box(p.reinforcement, [11.6, .035, .035], [0, y + .05, z], rebar, 'rebar');
  }
  for (const x of [-5.96, 5.96]) {
    for (let z = -4.8; z <= 4.81; z += .42) box(p.reinforcement, [.035, 2.5, .035], [x, 1.72, z], rebar, 'rebar');
    for (let y = .75; y <= 2.96; y += .42) box(p.reinforcement, [.035, .035, 9.65], [x, y, 0], rebar, 'rebar');
  }
  for (const z of [-4.96, 4.96]) {
    for (let x = -5.8; x <= 5.81; x += .42) box(p.reinforcement, [.035, 2.5, .035], [x, 1.72, z], rebar, 'rebar');
    for (let y = .75; y <= 2.96; y += .42) box(p.reinforcement, [11.7, .035, .035], [0, y, z], rebar, 'rebar');
  }
  box(p.membrane, [12, .04, 10], [0, .37, 0], membrane, 'waterproofing');
  for (const x of [-5.94, 5.94]) box(p.membrane, [.055, 2.45, 10], [x, 1.6, 0], membrane, 'waterproofing');
  box(p.membrane, [11.9, 2.45, .055], [0, 1.6, -4.94], membrane, 'waterproofing');
  // The near wall is a low section, leaving the membrane and junction bands visible.
  box(p.cutaway, [12.5, .65, .3], [0, .66, 5.1], concrete, 'section');
  for (const x of [-5.89, 5.89]) box(p.membrane, [.1, .12, 9.9], [x, .48, 0], seam, 'waterstop');
  box(p.membrane, [11.9, .12, .1], [0, .48, -4.88], seam, 'waterstop');
  for (let x = -5; x <= 5; x += 2) box(p.membrane, [.035, .012, 9.7], [x, .4, 0], seam, 'waterproofing');
  for (const x of [-7.9, 7.9]) for (const z of [-6.9, 6.9]) { box(p.site, [.1, 1, .1], [x, 3.2, z], m.gold, 'site'); box(p.site, [.13, .12, .13], [x, 3.73, z], m.warm, 'lighting'); }
  for (const x of [-8, 8]) box(p.site, [.05, .05, 14], [x, 3.65, 0], m.gold, 'site');
  return finalize(root, p, m, { exterior: ['site', 'base', 'walls', 'lid'], reinforcement: ['site', 'base', 'reinforcement'], waterproofing: ['site', 'base', 'membrane', 'cutaway'] }, {
    general: preset([26, 25, 30], [0, 1, 0]), front: preset([0, 23, 36], [0, 1, 0]), rear: preset([-26, 24, -28], [0, 1, 0]), top: preset([7, 37, 9], [0, 1, 0]),
    reinforcement: preset([18, 25, 21], [0, .8, 0], 'reinforcement'), waterproofing: preset([18, 23, 23], [0, .9, 0], 'waterproofing'),
    rebar: preset([14, 19, 18], [0, .9, 0], 'reinforcement'), junctions: preset([13, 17, 17], [0, .5, -1], 'waterproofing'), excavation: preset([23, 28, 26], [0, 1, 0]),
  }, { maxDistance: 90, shadowSpan: 24 });
}
