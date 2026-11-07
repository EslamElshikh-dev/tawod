import * as THREE from 'three';

// One daylight / blue-hour direction shared by GPU and software rendering.
export function createPresentation(scene, ground, lights, renderer) {
  const pixels=new Uint8Array(64*4),texture=new THREE.DataTexture(pixels,1,64,THREE.RGBAFormat);
  texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=texture.magFilter=THREE.LinearFilter;
  const top=new THREE.Color(),bottom=new THREE.Color(),color=new THREE.Color();
  function apply(night, interior=false) {
    const theme=night?{top:'#102930',bottom:'#52696c',ground:'#465b5c'}:{top:'#e0ebed',bottom:'#f6f0e3',ground:'#e6e0d1'};
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
    lights.hemi.color.set(night?'#b1ced9':'#edf7fa');lights.hemi.groundColor.set(night?'#777264':'#b1a489');lights.hemi.intensity=night?.98:2.25;
    lights.key.color.set(night?'#c1d8e8':'#fff0d9');lights.key.intensity=night?.76:2.85;
    lights.fill.color.set(night?'#b6cdd6':'#d6e5eb');lights.fill.intensity=night?.45:.72;
    lights.key.castShadow=!interior;
    if(interior){lights.hemi.color.set(night?'#e3e8ec':'#fff9ec');lights.hemi.groundColor.set('#c0b59d');lights.hemi.intensity=night?1.5:2.9;lights.key.intensity=.28;lights.fill.intensity=night?.14:.35;}
    if(renderer.isWebGLRenderer)renderer.toneMappingExposure=night?1.12:1.02;
  }
  apply(false);return {apply,dispose(){texture.dispose();}};
}
