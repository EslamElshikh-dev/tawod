import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .78, metalness: .02, ...extra });
function palette() {
  return {
    stone: material('#e4dac8'), white: material('#fff5e5'), wall: material('#e5dfd4'),
    dark: material('#253533', { metalness: .18, roughness: .36 }),
    floor: material('#c6b99f', { roughness: .45 }), paving: material('#d9d5c9'), base: material('#70796f'),
    wood: material('#906845'), fabric: material('#b3aa94'), linen: material('#ede6d9'), rug: material('#82948b'),
    green: material('#496b4c'), leaf: material('#63865a', { side: THREE.DoubleSide }), soil: material('#645943'),
    lawn: material('#829575'), water: material('#688f91', { roughness: .22, metalness: .35 }),
    gold: material('#b98d52', { metalness: .68, roughness: .32 }),
    glass: material('#253d3c', { metalness: .4, roughness: .22, emissive: '#ffd69a', emissiveIntensity: .025 }),
    warm: material('#fff1cb', { emissive: '#ffdc91', emissiveIntensity: 1.5 }),
  };
}
function mesh(parent, geometry, mat, position, detail) {
  const object = new THREE.Mesh(geometry, mat); object.position.set(...position);
  object.castShadow = true; object.receiveShadow = true;
  if (detail) object.userData.detail = detail; parent.add(object); return object;
}
const box = (p, size, at, m, tag) => mesh(p, new THREE.BoxGeometry(...size), m, at, tag);
const cylinder = (p, radius, height, at, m, tag, segments = 12) => mesh(p, new THREE.CylinderGeometry(radius, radius, height, segments), m, at, tag);
function group(parent, name) { const value = new THREE.Group(); value.name = name; parent.add(value); return value; }

// Merge by material within each independently visible layer.
function optimizePart(part) {
  part.updateMatrixWorld(true); const inverse = part.matrixWorld.clone().invert(), buckets = new Map(), originals = [], disposable = new Set(), retained = new Set();
  part.traverse(object => {
    if (!object.isMesh) return;
    if (object.isInstancedMesh) { retained.add(object.geometry); return; }
    if (Array.isArray(object.material)) return;
    const transform = new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld);
    let geometry = object.geometry.clone();
    if (geometry.index) { const expanded = geometry.toNonIndexed(); geometry.dispose(); geometry = expanded; }
    geometry.applyMatrix4(transform);
    const key = `${object.material.uuid}:${object.userData.detail || ''}`;
    if (!buckets.has(key)) buckets.set(key, { material: object.material, detail: object.userData.detail, geometries: [] });
    buckets.get(key).geometries.push(geometry); originals.push(object); disposable.add(object.geometry);
  });
  for (const object of originals) object.removeFromParent();
  for (const bucket of buckets.values()) {
    const merged = mergeGeometries(bucket.geometries, false); if (!merged) throw new Error('Could not merge the architectural model');
    mesh(part, merged, bucket.material, [0, 0, 0], bucket.detail); bucket.geometries.forEach(g => g.dispose());
  }
  disposable.forEach(g => { if (!retained.has(g)) g.dispose(); });
}

export { material, palette, mesh, box, cylinder, group, optimizePart };
