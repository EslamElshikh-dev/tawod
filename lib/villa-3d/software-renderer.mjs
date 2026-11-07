import * as THREE from 'three';

// A depth-buffered fallback keeps the same 3D geometry and camera controls usable
// when WebGL is unavailable. No remote service or graphics-policy change is needed.
export function collectFaces(scene) {
  scene.updateMatrixWorld(true);
  const faces = [], instance = new THREE.Matrix4(), world = new THREE.Matrix4();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  scene.traverse(object => {
    if (!object.isMesh || !object.visible) return;
    const geometry = object.geometry, positions = geometry.attributes.position, index = geometry.index;
    const count = index?.count || positions.count;
    for (let instanceIndex = 0; instanceIndex < (object.isInstancedMesh ? object.count : 1); instanceIndex++) {
      if (object.isInstancedMesh) { object.getMatrixAt(instanceIndex, instance); world.multiplyMatrices(object.matrixWorld, instance); }
      else world.copy(object.matrixWorld);
      for (let i = 0; i < count; i += 3) {
        a.fromBufferAttribute(positions, index ? index.getX(i) : i).applyMatrix4(world);
        b.fromBufferAttribute(positions, index ? index.getX(i + 1) : i + 1).applyMatrix4(world);
        c.fromBufferAttribute(positions, index ? index.getX(i + 2) : i + 2).applyMatrix4(world);
        const normal = b.clone().sub(a).cross(c.clone().sub(a));
        if (normal.lengthSq() < 1e-14) continue;
        const group = Array.isArray(object.material) ? geometry.groups.find(group => i >= group.start && i < group.start + group.count) : null;
        const material = Array.isArray(object.material) ? object.material[group?.materialIndex || 0] : object.material;
        faces.push({ vertices: [...a, ...b, ...c], normal: normal.normalize(), center: a.clone().add(b).add(c).multiplyScalar(1 / 3), material });
      }
    }
  });
  return faces;
}

export function rasterizeTriangle(pixels, depths, width, height, points, color) {
  const [ax, ay, az, bx, by, bz, cx, cy, cz] = points;
  const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (Math.abs(area) < .00001) return;
  const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxX = Math.min(width - 1, Math.ceil(Math.max(ax, bx, cx)));
  const minY = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxY = Math.min(height - 1, Math.ceil(Math.max(ay, by, cy)));
  const d1x = (by - cy) / area, d1y = (cx - bx) / area;
  const d2x = (cy - ay) / area, d2y = (ax - cx) / area;
  for (let y = minY; y <= maxY; y++) {
    let w1 = ((by - cy) * (minX + .5 - cx) + (cx - bx) * (y + .5 - cy)) / area;
    let w2 = ((cy - ay) * (minX + .5 - cx) + (ax - cx) * (y + .5 - cy)) / area;
    for (let x = minX; x <= maxX; x++, w1 += d1x, w2 += d2x) {
      const w3 = 1 - w1 - w2;
      if (w1 < -.00001 || w2 < -.00001 || w3 < -.00001) continue;
      const depth = w1 * az + w2 * bz + w3 * cz, offset = y * width + x;
      if (depth < -1 || depth > 1 || depth >= depths[offset]) continue;
      depths[offset] = depth;
      const pixel = offset * 4;
      pixels[pixel] = color[0]; pixels[pixel + 1] = color[1]; pixels[pixel + 2] = color[2]; pixels[pixel + 3] = 255;
    }
  }
}

export function createSoftwareRenderer() {
  const canvas = document.createElement('canvas'), context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Canvas rendering is unavailable');
  canvas.dataset.renderer = 'software';
  let width = 1, height = 1, buffer, depths, faces, disposed = false;
  const matrix = new THREE.Matrix4(), point = new THREE.Vector3(), points = new Array(9);
  const color = new THREE.Color(), emission = new THREE.Color(), towardCamera = new THREE.Vector3();
  return {
    domElement: canvas,
    setSize(w, h) {
      // Cap software resolution so touch gestures remain responsive on modest devices.
      const scale = Math.min(1.25, 900 / Math.max(w, h));
      width = Math.max(1, Math.round(w * scale)); height = Math.max(1, Math.round(h * scale));
      canvas.width = width; canvas.height = height;
      buffer = context.createImageData(width, height); depths = new Float32Array(width * height);
    },
    async compileAsync() {},
    render(scene, camera) {
      if (disposed || !buffer) return;
      faces ||= collectFaces(scene);
      camera.updateMatrixWorld(); matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      const pixels = buffer.data, background = scene.background.clone().convertLinearToSRGB();
      const br = Math.round(background.r * 255), bg = Math.round(background.g * 255), bb = Math.round(background.b * 255);
      for (let i = 0; i < pixels.length; i += 4) { pixels[i] = br; pixels[i + 1] = bg; pixels[i + 2] = bb; pixels[i + 3] = 255; }
      depths.fill(Infinity);
      const directional = []; let ambient = .25, localAmbient = 0;
      scene.traverse(light => {
        if (light.isHemisphereLight) ambient = light.intensity * .17;
        if (light.isDirectionalLight) directional.push({ direction: light.position.clone().normalize(), intensity: light.intensity * .23 });
        if (light.isPointLight) localAmbient += Math.min(.08, light.intensity * .004);
      });
      for (const face of faces) {
        towardCamera.copy(camera.position).sub(face.center);
        if (face.material.side !== THREE.DoubleSide && face.normal.dot(towardCamera) <= 0) continue;
        let clipped = false;
        for (let i = 0; i < 9; i += 3) {
          point.set(face.vertices[i], face.vertices[i + 1], face.vertices[i + 2]).applyMatrix4(matrix);
          if (point.z < -1 || point.z > 1) { clipped = true; break; }
          points[i] = (point.x * .5 + .5) * width; points[i + 1] = (-point.y * .5 + .5) * height; points[i + 2] = point.z;
        }
        if (clipped) continue;
        let intensity = (ambient + localAmbient) * (.85 + .15 * face.normal.y);
        for (const light of directional) intensity += Math.max(0, face.normal.dot(light.direction)) * light.intensity;
        color.copy(face.material.color).multiplyScalar(intensity);
        if (face.material.emissive) color.add(emission.copy(face.material.emissive).multiplyScalar(face.material.emissiveIntensity * .35));
        color.convertLinearToSRGB();
        rasterizeTriangle(pixels, depths, width, height, points, [Math.min(255, Math.round(color.r * 255)), Math.min(255, Math.round(color.g * 255)), Math.min(255, Math.round(color.b * 255))]);
      }
      context.putImageData(buffer, 0, 0);
    },
    dispose() { disposed = true; faces = undefined; buffer = undefined; depths = undefined; canvas.width = canvas.height = 1; },
  };
}
