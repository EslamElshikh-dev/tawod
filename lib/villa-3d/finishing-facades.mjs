import * as THREE from 'three';
import { mesh, box, cylinder } from './primitives.mjs';

// Photo-led facade details, kept separate from the reusable floor cutaways.
function arch(parent, radius, thickness, spring, x, z, m) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= 24; i++) {
    const a = i / 24 * Math.PI;
    const px = Math.cos(a) * (radius + thickness), py = Math.sin(a) * (radius + thickness);
    if (i === 0) shape.moveTo(px, py); else shape.lineTo(px, py);
  }
  for (let i = 24; i >= 0; i--) { const a = i / 24 * Math.PI; shape.lineTo(Math.cos(a) * radius, Math.sin(a) * radius); }
  shape.closePath();
  mesh(parent, new THREE.ExtrudeGeometry(shape, { depth: .18, bevelEnabled: false }), m, [x, spring, z], 'facade');
}
export function buildFinishingFacade(parts, m, { variant, base, rise, upperBase, roofY }) {
  const front = parts.front, ivory = variant === 'faisaliah';
  // A blind arched field and projecting pilaster frame anchor both elevations.
  box(front, [2.45, 2.9, .18], [0, upperBase + 1.68, -.36], m.stone, 'facade');
  for (const x of [-1.3, 1.3]) {
    box(front, [.25, roofY - base + .35, .36], [x, (base + roofY) / 2 + .08, -.23], m.white, 'facade');
    box(front, [.43, .16, .48], [x, base + .12, -.17], m.white, 'facade');
  }
  const spring = upperBase + 1.78;
  arch(front, .93, .12, spring, 0, -.12, m.white);
  for (const x of [-.99, .99]) box(front, [.12, 1.35, .19], [x, spring - .675, -.05], m.white, 'facade');
  box(front, [2.14, .12, .25], [0, spring - 1.35, -.03], m.white, 'facade');
  for (const [y, width, depth] of [[upperBase - .08, 9, .42], [roofY + .05, 9.18, .5], [roofY + .25, 9.4, .62], [roofY + .43, 9.58, .72]]) {
    box(front, [width, .12, depth], [0, y, -.53], m.white, 'cornice');
    for (const x of [-4.35, 4.35]) box(front, [.3, .12, 8.5], [x, y, -4.85], m.white, 'cornice');
  }
  if (ivory) {
    for (let x = -4.35; x <= 4.36; x += .25) box(front, [.12, .16, .2], [x, roofY + .14, -.13], m.stone, 'cornice');
    for (let y = base + .4; y < roofY - .35; y += .4) {
      for (const x of [-3.75, 3.75]) box(front, [1, .018, .018], [x, y, -.565], m.base, 'grooves');
    }
    box(front, [8.7, .32, .24], [0, base + .08, -.5], m.dark, 'facade');
  } else {
    // Grey plaster, narrow stepped profiles and a block boundary echo the site photo.
    for (let y = base + .4; y < upperBase; y += .45) for (const x of [-3.95, 3.95]) box(front, [.64, .022, .025], [x, y, -.56], m.base, 'grooves');
    for (const x of [-4.1, 4.1]) box(parts.roof, [.28, .5, 2.4], [x, roofY + .8, -2], m.stone, 'facade');
    for (const side of [-1, 1]) for (let z = -10; z <= 7; z += 1.3) {
      box(parts.site, [.32, 1.6, .32], [side * 7.98, .8, z], m.base, 'boundary');
      for (let y = .25; y < 1.2; y += .3) box(parts.site, [.21, .018, 1.2], [side * 7.91, y, z + .65], m.base, 'boundary');
    }
  }
  for (let i = 0; i < 3; i++) box(parts.site, [2.6, .15, 1.2 - i * .22], [0, .075 + .15 * i, .1 - i * .11], m.dark, 'entrance');
  for (const x of [-1.6, 1.6]) { cylinder(front, .055, .5, [x, base + 1.9, -.32], m.dark, 'lighting'); cylinder(front, .06, .18, [x, base + 1.9, -.25], m.warm, 'lighting'); }
}
