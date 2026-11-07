import * as THREE from 'three';
import { box, cylinder } from './primitives.mjs';

export function warmLight(parent, position, { intensity = 18, distance = 9, color = '#ffd5a1', day = 0, night = 1 } = {}) {
  const light = new THREE.PointLight(color, intensity, distance, 2);
  light.position.set(...position); light.userData.dayIntensity = intensity * day; light.userData.nightIntensity = intensity * night;
  light.intensity = light.userData.dayIntensity; parent.add(light); return light;
}
export function wallSconce(parent, x, y, z, m, { size = .18, intensity = 14 } = {}) {
  box(parent, [size, size * 2.4, size], [x, y, z], m.dark, 'lighting');
  box(parent, [size * .64, size * 1.4, size * 1.05], [x, y, z + size * .12], m.warm, 'lighting');
  warmLight(parent, [x, y, z + .3], { intensity, distance: 6 });
}
export function pathLight(parent, x, z, m) {
  cylinder(parent, .055, .55, [x, .34, z], m.dark, 'lighting', 8);
  cylinder(parent, .065, .09, [x, .64, z], m.warm, 'lighting', 8);
  warmLight(parent, [x, .72, z], { intensity: 6, distance: 4 });
}
export function setModelLighting(root, night) {
  const materials = new Set();
  root.traverse(object => {
    if (object.isPointLight) {
      object.userData.dayIntensity ??= object.intensity * .16;
      object.userData.nightIntensity ??= object.intensity * 1.6;
      object.intensity = night ? object.userData.nightIntensity : object.userData.dayIntensity;
    }
    for (const material of [object.material].flat().filter(Boolean)) {
      if (materials.has(material)) continue; materials.add(material);
      if (!material.emissive || material.emissive.getHex() === 0) continue;
      material.emissiveIntensity = material.userData.windowGlow ? (night ? .23 : .005) : (night ? 2.7 : .4);
    }
  });
}
