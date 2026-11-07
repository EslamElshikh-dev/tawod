import * as THREE from 'three';
import { material, mesh, box, group, apertureWall } from './primitives.mjs';
import { wallSconce, pathLight } from './illumination.mjs';

function arch(parent, radius, thickness, spring, x, z, m) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= 24; i++) {
    const a = i / 24 * Math.PI, px = Math.cos(a) * (radius + thickness), py = Math.sin(a) * (radius + thickness);
    if (i === 0) shape.moveTo(px, py); else shape.lineTo(px, py);
  }
  for (let i = 24; i >= 0; i--) { const a = i / 24 * Math.PI; shape.lineTo(Math.cos(a) * radius, Math.sin(a) * radius); }
  shape.closePath();
  mesh(parent, new THREE.ExtrudeGeometry(shape, { depth: .13, bevelEnabled: false }), m, [x, spring, z], 'facade');
}
function voidOpening(parent,x,y,w,h,z,m){box(parent,[w,h,.04],[x,y,z],m.dark,'facade');}
function surround(parent, x, y, w, h, z, m) {
  for (const sign of [-1,1]) {
    box(parent, [w + .25, .09, .18], [x, y + sign * h / 2, z], m.white, 'facade');
    box(parent, [.09, h, .18], [x + sign * w / 2, y, z], m.white, 'facade');
  }
  box(parent, [w + .4, .09, .27], [x, y - h / 2 - .07, z + .02], m.white, 'facade');
}
function frieze(parent, x, y, z, m) {
  const curve = new THREE.CatmullRomCurve3([[-.2,0,0],[-.11,.08,0],[0,0,0],[.11,-.06,0],[.2,.025,0]].map(p=>new THREE.Vector3(...p)));
  mesh(parent,new THREE.TubeGeometry(curve,10,.013,4,false),m,[x,y,z],'cornice');
}
export function buildFinishingEnvelope(parts, m, { variant, base, rise, upperBase, roofY }) {
  const ivory = variant === 'faisaliah';
  for (const [part, level, height] of [[parts.lowerShell,base,rise],[parts.upperShell,upperBase,roofY-upperBase]]) {
    const frontHoles = ivory
      ? (level === base ? [[-2.8,1.78,1.43,1.92],[2.8,1.78,1.43,1.92],[0,1.7,1.55,3.36]] : [[-2.8,1.63,1.63,2],[0,1.63,1.35,1.92],[2.8,1.63,1.35,1.92]])
      : (level === base ? [[-2.9,1.95,.58,1.65],[0,1.72,.96,1.3],[2.7,1.72,.93,1.3]] : [[0,1.7,1.05,1.45],[2.7,1.7,.95,1.45]]);
    const facade = group(part,'photo-front'); facade.position.set(0,level,-.7);
    apertureWall(facade,8.6,height,.22,frontHoles,[0,0,-.11],0,m.stone,'facade');
    for (const [x,y,w,h] of frontHoles) {
      voidOpening(facade,x,y,w,h,.015,m);
      if (ivory && x !== 0) surround(facade,x,y,w,h,.15,m);
    }
    const rear = group(part,'photo-rear'); rear.position.set(0,level,-9); rear.rotation.y=Math.PI;
    const rearHoles=[[-2.7,1.7,1.2,1.65],[0,1.7,1.2,1.65],[2.7,1.7,1.2,1.65]];
    apertureWall(rear,8.6,height,.2,rearHoles,[0,0,-.1],0,m.stone);
    for(const h of rearHoles)voidOpening(rear,...h,.02,m);
    for(const side of ivory?[-1,1]:[1]) {
      const wall=group(part,'photo-side');wall.position.set(side*4.3,level,-4.85);wall.rotation.y=side*Math.PI/2;
      const holes=(ivory?[-2.55,0,2.55]:[-2.45,1.7]).map(x=>[x,1.7,ivory?1.25:.85,ivory?1.75:1.5]);
      apertureWall(wall,8.3,height,.2,holes,[0,0,-.1],0,m.stone);
      for(const h of holes)voidOpening(wall,...h,.02,m);
    }
  }
  if (!ivory) {
    // The tall arched bay is on the left elevation, separate from the 2-over-3 window face.
    const wall=group(parts.front,'uhud-arched-wing');wall.position.set(-4.3,base,-4.85);wall.rotation.y=-Math.PI/2;
    const h=roofY-base+.55, shape=new THREE.Shape();shape.moveTo(-4.15,0);shape.lineTo(4.15,0);shape.lineTo(4.15,h);shape.lineTo(-4.15,h);shape.closePath();
    const hole=new THREE.Path();hole.moveTo(-2.48,.2);hole.lineTo(-2.48,5.15);hole.absarc(-1.5,5.15,.98,Math.PI,0,true);hole.lineTo(-.52,.2);hole.closePath();shape.holes.push(hole);
    for(const [x,y,w,hh] of [[1.05,4.55,.8,2.45],[2.5,4.55,.8,2.45]]) {
      const p=new THREE.Path();p.moveTo(x-w/2,y-hh/2);p.lineTo(x-w/2,y+hh/2);p.lineTo(x+w/2,y+hh/2);p.lineTo(x+w/2,y-hh/2);p.closePath();shape.holes.push(p);
      voidOpening(wall,x,y,w,hh,.01,m); surround(wall,x,y,w,hh,.13,m);
    }
    mesh(wall,new THREE.ExtrudeGeometry(shape,{depth:.2,bevelEnabled:false}),m.stone,[0,0,-.1],'facade');
    box(wall,[1.93,6.1,.06],[-1.5,3.2,.01],m.dark,'facade'); arch(wall,.99,.17,5.15,-1.5,.12,m.white);
    for(const x of [-2.57,-.43])box(wall,[.16,5.15,.3],[x,2.575,.16],m.white,'facade');
    for(const x of [-3.7,-2.8,0,3.5])box(wall,[.07,h,.1],[x,h/2,.08],m.stone,'grooves');
    box(wall,[8.6,.14,.43],[0,h+.06,0],m.white,'cornice');
    const low=group(parts.lowerFront,'uhud-wing-lower');low.position.copy(wall.position);low.rotation.y=wall.rotation.y;
    apertureWall(low,8.3,rise,.2,[[-1.5,1.72,1.92,3.4]],[0,0,-.1],0,m.stone,'facade');
    box(low,[1.9,3.4,.05],[-1.5,1.72,.03],m.dark,'facade');
  }
}
export function buildFinishingFacade(parts,m,{variant,base,rise,upperBase,roofY}) {
  const ivory=variant==='faisaliah', front=parts.front;
  if (ivory) {
    // The photograph has three upper windows below a blind arch in a raised central frame.
    for(const x of [-1.05,1.05]) {
      box(front,[.22,roofY-base+1.05,.42],[x,(roofY+base+1.05)/2,-.28],m.white,'facade');
      box(front,[.4,.16,.58],[x,roofY-.38,-.19],m.white,'cornice');
    }
    box(front,[2.32,1.25,.24],[0,roofY+.4,-.48],m.stone,'facade');
    arch(front,.91,.11,roofY-.04,0,-.2,m.white);
    for(const x of [-.97,.97])box(front,[.11,.27,.14],[x,roofY-.18,-.14],m.white,'facade');
    box(front,[2.6,.14,.55],[0,roofY+1.08,-.34],m.white,'cornice');
    box(front,[2.76,.12,.65],[0,roofY+1.22,-.34],m.white,'cornice');
    for(const [y,w,d] of [[upperBase-.12,8.7,.32],[roofY-.2,8.95,.43],[roofY+.04,9.13,.56],[roofY+.2,9.3,.64]])box(front,[w,.12,d],[0,y,-.53],m.white,'cornice');
    for(let x=-4.2;x<=4.21;x+=.26){box(front,[.11,.14,.19],[x,roofY-.05,-.15],m.white,'cornice');if(Math.abs(x)>1.2)frieze(front,x,roofY-.38,-.39,m.white);}
    const groove=material('#b6ad98');
    for(let y=base+.6;y<roofY-.52;y+=.43) {
      for(const [x,w] of [[-3.93,.68],[-1.55,.45],[1.55,.45],[3.93,.68]])box(front,[w,.018,.018],[x,y,-.565],groove,'grooves');
      // Long grooves stop at window and portal openings rather than passing across them.
      if(y>upperBase+2.8||y<base+.8||Math.abs(y-upperBase)<.1)box(front,[8.4,.018,.018],[0,y,-.565],groove,'grooves');
    }
    box(front,[8.7,.48,.25],[0,base+.08,-.51],m.dark,'facade');
    wallSconce(front,-1.35,base+2.1,-.27,m,{intensity:10});wallSconce(front,1.35,base+2.1,-.27,m,{intensity:10});
  } else {
    for(const [y,w,d] of [[roofY+.06,8.95,.42],[roofY+.2,9.08,.5],[roofY+.34,9.22,.58]])box(front,[w,.1,d],[0,y,-.54],m.white,'cornice');
    for(const y of [upperBase-.3,roofY-1.22])box(front,[8.5,.022,.022],[0,y,-.57],m.white,'grooves');
    // Recessed entry under the projecting corner, with exposed grey concrete below.
    box(front,[2.5,.22,1.05],[-2.95,base+1.25,-.19],m.stone,'facade');
    box(front,[2.35,1.1,.05],[-2.98,base+.55,-.53],m.dark,'entrance');
    for(const x of [-4.37,4.37])box(front,[.22,.15,8.5],[x,roofY+.2,-4.85],m.white,'cornice');
    wallSconce(front,1.4,base+2.7,-.28,m,{intensity:12});
  }
  for(let i=0;i<3;i++)box(parts.site,[2.3,.15,1.1-i*.2],[0,.075+i*.15,.03-i*.12],m.base,'entrance');
}
export function buildFinishingRoof(parts,m,{variant,roofY}) {
  for(const x of [-4.28,4.28])box(parts.roof,[.18,.48,8.4],[x,roofY+.36,-4.85],m.stone,'terrace');
  for(const z of [-.7,-9])box(parts.roof,[8.75,.48,.18],[0,roofY+.36,z],m.stone,'terrace');
  if(variant==='uhud') {
    box(parts.roof,[4.35,.65,3.7],[-2.15,roofY+.47,-7.1],m.stone,'terrace');
    for(const z of [-8.9,-5.25])box(parts.roof,[4.6,.13,.27],[-2.15,roofY+.87,z],m.white,'terrace');
    for(const x of [1.6,3.6])for(const z of [-4,-2])box(parts.roof,[.18,2,.18],[x,roofY+1.2,z],m.stone,'terrace');
    box(parts.roof,[2.24,.16,2.24],[2.6,roofY+2.26,-3],m.white,'terrace');
  } else {
    box(parts.roof,[2.2,1.4,2.4],[2.8,roofY+.92,-7.3],m.stone,'terrace');
    box(parts.roof,[2.4,.14,2.6],[2.8,roofY+1.69,-7.3],m.white,'terrace');
  }
}
export function buildFinishingSite(parent,m,variant) {
  const soil=material(variant==='uhud'?'#bdae94':'#c7b79a'), concrete=material('#a5a697'), mortar=material('#777e73');
  box(parent,[15.4,.3,17.4],[0,-.15,-2.8],m.base,'site');box(parent,[15,.06,17],[0,.03,-2.8],soil,'site');
  for(const side of [-1,1]) {
    box(parent,[.2,1.5,16.6],[side*7.4,.78,-2.8],concrete,'boundary');
    for(let z=-10.5;z<5.5;z+=2.1)box(parent,[.29,1.8,.29],[side*7.4,.92,z],m.base,'boundary');
    for(let y=.3;y<1.5;y+=.26)box(parent,[.225,.016,16.5],[side*7.4,y,-2.8],mortar,'boundary');
    for(let z=-10.3;z<5.4;z+=.56)for(let row=0;row<5;row++)box(parent,[.225,.23,.012],[side*7.4,.24+row*.26,z+(row%2)*.28],mortar,'boundary');
  }
  box(parent,[14.8,1.5,.2],[0,.78,-11.2],concrete,'boundary');
  for(const x of [-7.4,-3.7,1.2,7.4])box(parent,[.33,variant==='uhud'?1.9:2.5,.33],[x,variant==='uhud'?.95:1.25,5.5],m.base,'boundary');
  for(const [x,w] of [[-5.55,3.4],[4.3,5.8]])box(parent,[w,variant==='uhud'?1.55:.78,.2],[x,variant==='uhud'?.8:.4,5.5],concrete,'boundary');
  for(let y=.26;y<1.55;y+=.26)for(const [x,w]of[[-5.55,3.4],[4.3,5.8]])box(parent,[w,.016,.225],[x,y,5.5],mortar,'boundary');
  for(let z=1.2;z<5.4;z+=.8)box(parent,[2.2,.04,.58],[-1.1,.08,z],m.paving,'paths');
  for(const [x,z]of[[-6,2.9],[5.9,-.1]]) {
    for(let n=0;n<4;n++)box(parent,[1.2,.1,.55],[x,.12+n*.11,z],m.wood,'materials');
    pathLight(parent,x,z+1.2,m);
  }
  for(let row=0;row<2;row++)for(let n=0;n<3;n++)box(parent,[.38,.2,.2],[5.8+n*.4,.13+row*.21,2.7],concrete,'materials');
  parent.userData.photoStage='plaster-and-finishing';
}
