import * as THREE from 'three';

// A depth-buffered fallback keeps the same 3D geometry and camera controls usable
// when WebGL is unavailable. No remote service or graphics-policy change is needed.
export function collectFaces(scene) {
  scene.updateMatrixWorld(true);
  const faces = [], instance = new THREE.Matrix4(), world = new THREE.Matrix4();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  scene.traverseVisible(object => {
    if (!object.isMesh || object.userData.presentationGround) return;
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
        faces.push({ vertices: [...a, ...b, ...c], normal: normal.normalize(), center: a.clone().add(b).add(c).multiplyScalar(1 / 3), material, castShadow: object.castShadow, receiveShadow: object.receiveShadow });
      }
    }
  });
  return faces;
}

export function rasterizeTriangle(pixels, depths, width, height, points, color, shading = null) {
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
      let r=color[0],g=color[1],b=color[2];
      if(shading){
        const iw=shading.inverseW, reciprocal=1/(w1*iw[0]+w2*iw[1]+w3*iw[2]);
        const a=w1*iw[0]*reciprocal,bb=w2*iw[1]*reciprocal,c=w3*iw[2]*reciprocal;
        if(shading.colors){const rgb=shading.colors;r=a*rgb[0]+bb*rgb[3]+c*rgb[6];g=a*rgb[1]+bb*rgb[4]+c*rgb[7];b=a*rgb[2]+bb*rgb[5]+c*rgb[8];}
        if(shading.shadow){
          const s=shading.shadow,v=shading.shadowCoordinates;
          const sx=a*v[0]+bb*v[3]+c*v[6],sy=a*v[1]+bb*v[4]+c*v[7],sz=a*v[2]+bb*v[5]+c*v[8]-shading.bias;
          if(sx>1&&sy>1&&sx<s.size-2&&sy<s.size-2){
            const px=Math.floor(sx),py=Math.floor(sy),o=py*s.size+px;
            let cover=0;for(const delta of s.offsets)if(sz>s.depths[o+delta])cover++;
            const shade=1-cover*.2*shading.darkness;r*=shade;g*=shade;b*=shade;
          }
        }
      }
      const opacity=shading?.opacity??1;
      pixels[pixel]=r*opacity+pixels[pixel]*(1-opacity);pixels[pixel+1]=g*opacity+pixels[pixel+1]*(1-opacity);pixels[pixel+2]=b*opacity+pixels[pixel+2]*(1-opacity);pixels[pixel+3]=255;
    }
  }
}

export function createSoftwareRenderer() {
  const canvas = document.createElement('canvas'), context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Canvas rendering is unavailable');
  canvas.dataset.renderer = 'software';
  let width = 1, height = 1, buffer, depths, faces, shadow, shadowKey, disposed = false, requestedWidth=1,requestedHeight=1,interactive=false;
  const matrix = new THREE.Matrix4(), point = new THREE.Vector3(), points = new Array(9);
  const color = new THREE.Color(), emission = new THREE.Color(), towardCamera = new THREE.Vector3();
  function resize(w,h){
    requestedWidth=w;requestedHeight=h;
    const scale=Math.min(1.25,900/Math.max(w,h))*(interactive?.68:1);
    width=Math.max(1,Math.round(w*scale));height=Math.max(1,Math.round(h*scale));
    canvas.width=width;canvas.height=height;
    buffer=context.createImageData(width,height);depths=new Float32Array(width*height);
  }
  return {
    domElement: canvas,
    setSize(w, h) {
      // Cap software resolution so touch gestures remain responsive on modest devices.
      resize(w,h);
    },
    setInteractive(value){if(value!==interactive){interactive=value;resize(requestedWidth,requestedHeight);}},
    async compileAsync() {},
    invalidateScene() { faces = undefined; shadow = undefined; },
    render(scene, camera) {
      if (disposed || !buffer) return;
      faces ||= collectFaces(scene);
      camera.updateMatrixWorld(); matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      const pixels = buffer.data, background = scene.background?.isColor ? scene.background.clone().convertLinearToSRGB() : new THREE.Color('#e8e6df');
      const theme=scene.userData.presentation;
      const top=new THREE.Color(theme?.top||'#e8e6df').convertLinearToSRGB(),bottom=new THREE.Color(theme?.bottom||'#e8e6df').convertLinearToSRGB();
      if(!theme)top.copy(background),bottom.copy(background);
      for(let y=0;y<height;y++){
        const t=Math.min(1,y/Math.max(1,height-1)*1.25),r=Math.round((top.r+(bottom.r-top.r)*t)*255),g=Math.round((top.g+(bottom.g-top.g)*t)*255),b=Math.round((top.b+(bottom.b-top.b)*t)*255);
        for(let x=0;x<width;x++){const i=(y*width+x)*4;pixels[i]=r;pixels[i+1]=g;pixels[i+2]=b;pixels[i+3]=255;}
      }
      depths.fill(Infinity);
      const directional=[],local=[];let ambient=.35,sky=new THREE.Color('#ffffff'),earth=new THREE.Color('#c1bdad'),shadowLight;
      scene.traverseVisible(light=>{
        if(light.isHemisphereLight){ambient=light.intensity*.22;sky.copy(light.color);earth.copy(light.groundColor);}
        if(light.isDirectionalLight){directional.push({direction:light.getWorldPosition(new THREE.Vector3()).sub(light.target.getWorldPosition(new THREE.Vector3())).normalize(),intensity:light.intensity*.22,color:light.color,source:light});if(light.castShadow)shadowLight=light;}
        if(light.isPointLight&&light.intensity>.01)local.push({position:light.getWorldPosition(new THREE.Vector3()),color:light.color,intensity:light.intensity,distance:light.distance});
      });
      if(shadowLight){
        const key=shadowLight.position.toArray().join(',')+':'+shadowLight.intensity;
        if(!shadow||key!==shadowKey){
          shadowKey=key;shadowLight.shadow.updateMatrices(shadowLight);
          const lightCamera=shadowLight.shadow.camera,lightMatrix=new THREE.Matrix4().multiplyMatrices(lightCamera.projectionMatrix,lightCamera.matrixWorldInverse),size=192;
          const map=new Float32Array(size*size).fill(Infinity),dummy=new Uint8ClampedArray(size*size*4),vertices=new Array(9),v=new THREE.Vector3();
          for(const face of faces){if(!face.castShadow||face.material.opacity<.9)continue;for(let i=0;i<9;i+=3){v.set(face.vertices[i],face.vertices[i+1],face.vertices[i+2]).applyMatrix4(lightMatrix);vertices[i]=(v.x*.5+.5)*size;vertices[i+1]=(-v.y*.5+.5)*size;vertices[i+2]=v.z;}rasterizeTriangle(dummy,map,size,size,vertices,[0,0,0]);}
          shadow={depths:map,size,matrix:lightMatrix,offsets:[0,-1,1,-size,size]};
        }
      }else shadow=undefined;
      const rgb=new Array(9),shadowCoordinates=new Array(9),inverseW=new Array(3),vertex=new THREE.Vector3(),lightPoint=new THREE.Vector3();
      function shade(position,normal,mat){
        const blend=Math.max(0,Math.min(1,normal.y*.5+.5));
        let lr=(earth.r+(sky.r-earth.r)*blend)*ambient,lg=(earth.g+(sky.g-earth.g)*blend)*ambient,lb=(earth.b+(sky.b-earth.b)*blend)*ambient;
        for(const light of directional){const power=Math.max(0,normal.dot(light.direction))*light.intensity;lr+=light.color.r*power;lg+=light.color.g*power;lb+=light.color.b*power;}
        for(const light of local){
          lightPoint.copy(light.position).sub(position);const distance=lightPoint.length();if(light.distance&&distance>light.distance)continue;
          const falloff=light.distance?Math.pow(Math.max(0,1-Math.pow(distance/light.distance,4)),2):1;
          const power=Math.max(0,normal.dot(lightPoint.multiplyScalar(1/Math.max(.01,distance))))*light.intensity*.22*falloff/(1+distance*distance);
          lr+=light.color.r*power;lg+=light.color.g*power;lb+=light.color.b*power;
        }
        color.setRGB(mat.color.r*lr,mat.color.g*lg,mat.color.b*lb);
        if(mat.emissive)color.add(emission.copy(mat.emissive).multiplyScalar(mat.emissiveIntensity*.3));
        if(scene.fog){const d=position.distanceTo(camera.position),f=THREE.MathUtils.smoothstep(d,scene.fog.near,scene.fog.far);color.lerp(scene.fog.color,f*.7);}
        color.convertLinearToSRGB();return [Math.min(255,color.r*255),Math.min(255,color.g*255),Math.min(255,color.b*255)];
      }
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
        const flat=shade(face.center,face.normal,face.material);
        const useLocal=local.length>0;
        for(let i=0;i<9;i+=3){
          vertex.set(face.vertices[i],face.vertices[i+1],face.vertices[i+2]);
          const e=matrix.elements;inverseW[i/3]=1/(e[3]*vertex.x+e[7]*vertex.y+e[11]*vertex.z+e[15]);
          if(useLocal){const value=shade(vertex,face.normal,face.material);rgb[i]=value[0];rgb[i+1]=value[1];rgb[i+2]=value[2];}
          if(shadow){vertex.applyMatrix4(shadow.matrix);shadowCoordinates[i]=(vertex.x*.5+.5)*shadow.size;shadowCoordinates[i+1]=(-vertex.y*.5+.5)*shadow.size;shadowCoordinates[i+2]=vertex.z;}
        }
        const receives=shadow&&face.normal.y>.25&&face.receiveShadow&&(!face.material.emissive?.getHex()||face.material.emissiveIntensity<.5)&&shadowLight&&face.normal.dot(directional.find(light=>light.source===shadowLight)?.direction||directional[0].direction)>.08;
        rasterizeTriangle(pixels,depths,width,height,points,flat,{inverseW,colors:useLocal?rgb:null,shadow:receives?shadow:null,shadowCoordinates,bias:.0015+(1-Math.max(0,face.normal.dot(directional.find(light=>light.source===shadowLight)?.direction||directional[0]?.direction||face.normal)))*.006,darkness:theme?.night ? .3 : .45,opacity:face.material.opacity});
      }
      context.putImageData(buffer, 0, 0);
    },
    dispose() { disposed = true; faces = undefined; shadow=undefined; buffer = undefined; depths = undefined; canvas.width = canvas.height = 1; },
  };
}
