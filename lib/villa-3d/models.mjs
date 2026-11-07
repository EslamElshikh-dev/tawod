import * as THREE from 'three';

// Architectural illustrations, not surveyed dimensions or construction drawings.
const standard = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .72, metalness: .02, ...extra });
const materials = () => ({
  stone: standard('#eee7d9'), trim: standard('#fff9eb'), wall: standard('#e4ded3'),
  floor: standard('#c9bca3', { roughness: .38 }), plinth: standard('#73766e'),
  black: standard('#1c2525', { roughness: .3, metalness: .2 }),
  glass: standard('#243334', { roughness: .18, metalness: .55 }),
  gold: standard('#bc8a45', { roughness: .34, metalness: .72 }),
  warm: standard('#fff4d2', { emissive: '#ffdc91', emissiveIntensity: 1.5 }),
  darkStone: standard('#20292a', { roughness: .28, metalness: .08 }),
});
function add(parent, geometry, material, position, detail) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true;
  if (detail) mesh.userData.detail = detail;
  parent.add(mesh); return mesh;
}
const box = (p, size, position, mat, tag) => add(p, new THREE.BoxGeometry(...size), mat, position, tag);
const cylinder = (p, rt, rb, h, position, mat, tag, segments = 24) => add(p, new THREE.CylinderGeometry(rt, rb, h, segments), mat, position, tag);
function frame(p, x, y, w, h, z, mat, tag, thickness = .075) {
  box(p, [w + thickness, thickness, .12], [x, y + h / 2, z], mat, tag);
  box(p, [w + thickness, thickness, .12], [x, y - h / 2, z], mat, tag);
  box(p, [thickness, h, .12], [x - w / 2, y, z], mat, tag);
  box(p, [thickness, h, .12], [x + w / 2, y, z], mat, tag);
}
function room() {
  const group = new THREE.Group(), m = materials(); group.name = 'Illustrative interior';
  box(group, [8.1, .22, 5.9], [0, -.13, 0], m.plinth, 'floor');
  box(group, [7.8, .06, 5.6], [0, .015, 0], m.floor, 'floor');
  // Fine, raised grout joints avoid texture downloads and texture seams.
  const grout = standard('#eee7d7');
  for (let x = -3.3; x < 3.8; x += .65) box(group, [.012, .006, 5.6], [x, .049, 0], grout, 'floor');
  for (let z = -2.4; z < 2.8; z += .65) box(group, [7.8, .006, .012], [0, .049, z], grout, 'floor');
  box(group, [7.9, 3.3, .14], [0, 1.67, -2.83], m.wall, 'walls');
  box(group, [.14, 3.3, 5.6], [3.97, 1.67, 0], m.wall, 'walls');
  box(group, [.14, 3.3, 2.3], [-3.97, 1.67, -1.65], m.wall, 'walls');
  box(group, [7.8, .12, .035], [0, .12, -2.74], m.trim, 'walls');
  box(group, [.035, .12, 5.6], [3.88, .12, 0], m.trim, 'walls');
  box(group, [.035, .12, 2.3], [-3.88, .12, -1.65], m.trim, 'walls');
  box(group, [.45, 3.3, .55], [.6, 1.67, -1.8], m.wall, 'walls');
  // The open ceiling is an intentional cutaway so the interior stays visible.
  box(group, [7.9, .12, .66], [0, 3.36, -2.5], m.trim, 'lighting');
  box(group, [.72, .12, 5.6], [3.58, 3.36, 0], m.trim, 'lighting');
  box(group, [2.7, .055, .055], [2.15, 3.34, -2.12], m.warm, 'lighting');
  box(group, [.055, .055, 3.55], [3.18, 3.34, -.58], m.warm, 'lighting');
  box(group, [2.7, .055, .055], [-1.6, 3.34, -2.12], m.warm, 'lighting');
  for (const z of [-1.95, -.7]) {
    box(group, [.28, .36, 1], [-3.74, 2.76, z], m.trim, 'walls');
    box(group, [.025, .05, .83], [-3.59, 2.65, z], m.black, 'walls');
    box(group, [.026, .018, .72], [-3.58, 2.8, z], m.wall, 'walls');
  }
  for (const x of [-2.6, -.4, 2.4]) box(group, [.15, .08, .025], [x, .43, -2.74], m.black, 'walls');
  for (const z of [-1.9, .6, 1.8]) box(group, [.025, .08, .15], [3.88, .43, z], m.black, 'walls');
  for (const position of [[2.7, 2.9, -1.3], [-2.1, 2.9, -1.9]]) {
    const light = new THREE.PointLight('#ffe6b7', 4, 7, 2); light.position.set(...position); group.add(light);
  }
  return { group, emissive: m.warm, presets: {
    general: { position: [-9, 6.7, 10], target: [0, 1.3, -.2] },
    front: { position: [.1, 4.1, 12.8], target: [0, 1.5, -.6] },
    top: { position: [-6, 11.3, 7], target: [0, .8, -.3] },
    lighting: { position: [-7.8, 5.4, 6.9], target: [1, 2.45, -1.4] },
    floor: { position: [-7.9, 5.1, 9.8], target: [0, .3, 0] },
    walls: { position: [-8.6, 4.6, 8.2], target: [.7, 1.65, -1.2] },
  }, minDistance: 7, maxDistance: 23 };
}
function entrance() {
  const group = new THREE.Group(), m = materials(); group.name = 'Illustrative classical entrance';
  box(group, [9.2, .2, 5.9], [0, -.12, 1], m.plinth, 'entrance');
  for (let i = 0; i < 6; i++) {
    box(group, [7.3 - i * .23, .16, 3.3 - i * .36], [0, .08 + i * .16, 1.4 - i * .18], m.darkStone, 'steps');
    for (const side of [-1, 1]) box(group, [.13, .035, .04], [side * (3.28 - i * .11), .12 + i * .16, 3.065 - i * .36], m.warm, 'steps');
  }
  const wall = new THREE.Shape(); wall.moveTo(-4.3, .96); wall.lineTo(4.3, .96); wall.lineTo(4.3, 9); wall.lineTo(-4.3, 9); wall.closePath();
  const hole = (x, y, w, h) => { const path = new THREE.Path(); path.moveTo(x - w / 2, y - h / 2); path.lineTo(x - w / 2, y + h / 2); path.lineTo(x + w / 2, y + h / 2); path.lineTo(x + w / 2, y - h / 2); path.closePath(); wall.holes.push(path); };
  hole(0, 2.63, 2.45, 3.3); hole(-3, 2.8, 1.42, 2.18); hole(3, 2.8, 1.42, 2.18);
  add(group, new THREE.ExtrudeGeometry(wall, { depth: .35, bevelEnabled: false }), m.stone, [0, 0, -.7], 'columns');
  box(group, [8.85, .2, .58], [0, 9.04, -.48], m.trim, 'columns');
  for (const side of [-1, 1]) {
    const x = side * 1.7;
    cylinder(group, .4, .43, .18, [x, 1.05, .45], m.trim, 'columns');
    cylinder(group, .33, .36, .22, [x, 1.25, .45], m.trim, 'columns');
    cylinder(group, .26, .3, 4.0, [x, 3.34, .45], m.stone, 'columns', 40);
    cylinder(group, .39, .3, .16, [x, 5.4, .45], m.trim, 'columns');
    cylinder(group, .43, .43, .15, [x, 5.54, .45], m.trim, 'columns');
    for (let n = 0; n < 16; n++) {
      const a = n / 16 * Math.PI * 2;
      cylinder(group, .018, .018, 3.82, [x + Math.sin(a) * .278, 3.34, .45 + Math.cos(a) * .278], m.trim, 'columns', 6);
    }
    frame(group, side * 3, 2.8, 1.66, 2.42, -.26, m.trim, 'entrance', .1);
    box(group, [1.4, 2.16, .07], [side * 3, 2.8, -.48], m.glass, 'entrance');
    frame(group, side * 3, 2.8, 1.38, 2.16, -.38, m.black, 'entrance', .05);
    for (const dx of [-.45, 0, .45]) box(group, [.025, 2.16, .05], [side * 3 + dx, 2.8, -.34], m.black, 'entrance');
    for (const y of [2.3, 2.9, 3.5]) box(group, [1.4, .027, .05], [side * 3, y, -.34], m.black, 'entrance');
    frame(group, side * 3, 6.65, 1.75, 3.55, -.27, m.trim, 'columns', .055);
    box(group, [.12, 8.1, .13], [side * 4.05, 4.99, -.29], m.trim, 'columns');
    const lx = side * 2.15;
    box(group, [.24, .7, .24], [lx, 3.4, -.12], m.black, 'entrance');
    box(group, [.17, .53, .255], [lx, 3.4, -.1], m.warm, 'entrance');
    const cap = add(group, new THREE.ConeGeometry(.2, .2, 4), m.black, [lx, 3.85, -.12], 'entrance'); cap.rotation.y = Math.PI / 4;
  }
  box(group, [2.44, 3.33, .09], [0, 2.63, -.53], m.glass, 'entrance');
  box(group, [2.6, .08, .3], [0, .95, -.25], m.darkStone, 'steps');
  frame(group, 0, 2.63, 2.48, 3.38, -.32, m.black, 'entrance', .12);
  for (const x of [-.6, 0, .6]) box(group, [.045, 3.27, .07], [x, 2.63, -.27], m.black, 'entrance');
  for (const y of [1.65, 2.7, 3.62]) box(group, [2.42, .035, .07], [0, y, -.27], m.black, 'entrance');
  for (const x of [-.11, .11]) cylinder(group, .028, .028, .45, [x, 2.5, -.19], m.gold, 'entrance', 10);
  for (const [radius, height, y] of [[2.65, .48, 5.88], [2.73, .13, 5.61], [2.66, .12, 6.17], [2.68, .16, 7.23]]) {
    add(group, new THREE.CylinderGeometry(radius, radius, height, 64, 1, false, -Math.PI / 2, Math.PI), m.trim, [0, y, -.48], 'columns');
  }
  const profile = [[.07, 0], [.095, .06], [.1, .15], [.065, .31], [.12, .47], [.08, .65], [.055, .9], [.085, 1]].map(([x, y]) => new THREE.Vector2(x, y));
  const balusters = new THREE.InstancedMesh(new THREE.LatheGeometry(profile, 12), m.stone, 25);
  for (let i = 0; i < 25; i++) { const a = -1.48 + i / 24 * 2.96; balusters.setMatrixAt(i, new THREE.Matrix4().makeTranslation(Math.sin(a) * 2.55, 6.22, Math.cos(a) * 2.55 - .48)); }
  balusters.castShadow = true; balusters.receiveShadow = true; balusters.userData.detail = 'columns'; group.add(balusters);
  // A modest chandelier expresses the visible entrance lighting, without hidden rooms.
  cylinder(group, .035, .035, 1, [0, 5.15, .9], m.gold, 'entrance', 12);
  add(group, new THREE.SphereGeometry(.16, 16, 12), m.gold, [0, 4.76, .9], 'entrance');
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, x = Math.sin(a) * .65, z = Math.cos(a) * .65 + .9;
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 4.78, .9), new THREE.Vector3(x * .7, 4.46, (z - .9) * .7 + .9), new THREE.Vector3(x, 4.7, z)]);
    add(group, new THREE.TubeGeometry(curve, 10, .022, 6, false), m.gold, [0, 0, 0], 'entrance');
    cylinder(group, .09, .05, .08, [x, 4.74, z], m.gold, 'entrance', 12);
    cylinder(group, .023, .025, .2, [x, 4.88, z], m.warm, 'entrance', 8);
    const crystal = add(group, new THREE.OctahedronGeometry(.065), m.trim, [x, 4.38, z], 'entrance'); crystal.scale.y = 1.8;
  }
  const glow = new THREE.PointLight('#ffdca5', 13, 6, 2); glow.position.set(0, 4.5, 1.3); group.add(glow);
  return { group, emissive: m.warm, presets: {
    general: { position: [10.8, 7.8, 15], target: [0, 4.1, .45] },
    front: { position: [0, 5.1, 18.8], target: [0, 4.2, .1] },
    top: { position: [10.8, 12, 13], target: [0, 4.3, .1] },
    entrance: { position: [6.9, 5.3, 10.6], target: [0, 3.2, .4] },
    columns: { position: [8.9, 8.1, 12.5], target: [0, 5.1, .25] },
    steps: { position: [7.1, 4.3, 10.8], target: [0, 1.5, 1.1] },
  }, minDistance: 8, maxDistance: 29 };
}

export function buildVillaModel(variant) {
  if (variant === 'interior') return room();
  if (variant === 'entrance') return entrance();
  throw new Error('Unknown villa illustration');
}

export function disposeModel(root) {
  const geometry = new Set(), material = new Set();
  root.traverse(object => { if (object.geometry) geometry.add(object.geometry); for (const m of [object.material].flat().filter(Boolean)) material.add(m); });
  geometry.forEach(g => g.dispose()); material.forEach(m => m.dispose());
}
