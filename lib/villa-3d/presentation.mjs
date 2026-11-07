import * as THREE from 'three';

// One daylight / blue-hour direction shared by GPU and software rendering.
export function createPresentation(scene, ground, lights, renderer) {
  const pixels=new Uint8Array(64*4),texture=new THREE.DataTexture(pixels,1,64,THREE.RGBAFormat);
  texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=texture.magFilter=THREE.LinearFilter;
  const top=new THREE.Color(),bottom=new THREE.Color(),color=new THREE.Color();
  function apply(night, interior=false) {
    const theme=night?{top:'#182e44',bottom:'#627181',ground:'#576878'}:{top:'#d6e3e7',bottom:'#f3eddf',ground:'#e4dfd0'};
    scene.userData.presentation={...theme,night};
    top.set(theme.top).convertLinearToSRGB();bottom.set(theme.bottom).convertLinearToSRGB();
    for(let y=0;y<64;y++){
      color.copy(bottom).lerp(top,y/63);const offset=y*4;
      pixels[offset]=Math.round(color.r*255);pixels[offset+1]=Math.round(color.g*255);pixels[offset+2]=Math.round(color.b*255);pixels[offset+3]=255;
    }
    texture.needsUpdate=true;
    scene.background=renderer.isWebGLRenderer?texture:new THREE.Color(theme.bottom);
    scene.fog=new THREE.Fog(theme.bottom,80,240);
    ground.material.color.set(theme.ground);
    lights.hemi.color.set(night?'#a9c5e8':'#e7f3fa');lights.hemi.groundColor.set(night?'#716961':'#a69d82');lights.hemi.intensity=night?.9:2.2;
    lights.key.color.set(night?'#b9d4f2':'#fff0d6');lights.key.intensity=night?.72:3.1;
    lights.fill.color.set(night?'#b5cbed':'#d4e5f4');lights.fill.intensity=night?.42:.7;
    lights.key.castShadow=!interior;
    if(interior){lights.hemi.color.set(night?'#e3e8ec':'#fff9ec');lights.hemi.groundColor.set('#c0b59d');lights.hemi.intensity=night?1.5:2.9;lights.key.intensity=.28;lights.fill.intensity=night?.14:.35;}
    if(renderer.isWebGLRenderer)renderer.toneMappingExposure=night?1.12:1.02;
  }
  apply(false);return {apply,dispose(){texture.dispose();}};
}
