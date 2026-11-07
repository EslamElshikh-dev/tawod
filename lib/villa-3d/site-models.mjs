import * as THREE from 'three';
import { setModelLighting, warmLight } from './illumination.mjs';
import { palette, material, mesh, box, cylinder, group, optimizePart } from './primitives.mjs';

const preset = (position, target, mode = 'exterior') => ({ position, target, mode });
function beam(parent, a, b, width, depth, mat, tag) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const value = box(parent, [width, start.distanceTo(end), depth], start.clone().add(end).multiplyScalar(.5).toArray(), mat, tag);
  value.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
  return value;
}
function finalize(root, parts, m, modes, presets, settings = {}) {
  m.glass.userData.windowGlow=true;
  for (const part of Object.values(parts)) optimizePart(part);
  let mode;
  function setMode(next) {
    if (!modes[next]) throw new Error('Unknown project display mode');
    mode = next;
    for (const [name, part] of Object.entries(parts)) part.visible = modes[next].includes(name);
    return next;
  }
  setMode('exterior');
  return { group: root, parts, presets, emissive: m.warm, minDistance: 9, maxDistance: 110, ...settings, setMode, get mode() { return mode; }, setLighting(night) { setModelLighting(root,night); } };
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
  const m=palette(),root=new THREE.Group();root.name='Al Arouba photographed building cluster';m.glass.emissive.set('#000000');
  m.stone.color.set('#aaa99a');m.white.color.set('#bcbdb1');
  const plaster=material('#e4ded0'),mortar=material('#767e73'),soil=material('#c2a981');
  const p=makeParts(root,['site','base','columns','blockwork','plaster','roof','tower','ramp']);
  root.userData.components=['mosque','villa-1','villa-2'];
  root.userData.photoFeatures=['joined-volumes','exposed-blockwork','concrete-grid','rectangular-entry','bare-tower','inclined-access'];
  box(p.site,[27,.3,24],[0,-.15,-2],m.base,'site');box(p.site,[26.7,.06,23.7],[0,.04,-2],soil,'site');
  box(p.base,[20.1,.32,11.7],[0,.19,-3.2],m.base,'structure');
  const bays=[{x:-6.6,z:-2.5,h:8.1},{x:0,z:-3.2,h:8.7},{x:6.6,z:-3.8,h:9.1}];
  for(const [index,bay]of bays.entries()) {
    const {x,z,h}=bay;
    const holes=index===1?[[0,2.65,1.45,5.2],[-2.15,2,.64,1.3],[2.15,2,.64,1.3],[-2.15,6,.55,1.2],[2.15,6,.55,1.2]]:[[-1.65,2,.65,1.45],[1.65,2,.65,1.45],[0,5.8,.75,1.75]];
    for(const [part,mat]of[[p.blockwork,m.stone],[p.plaster,plaster]]) {
      const front=group(part,'arouba-front-'+index);front.position.set(x,.35,z+5.6);
      openingWall(front,6.6,h,.22,holes,[0,0,0],0,mat,'facade');
      for(const [xx,yy,w,hh]of holes)box(front,[w,hh,.045],[xx,yy,.02],m.dark,'openings');
      const rear=group(part,'arouba-rear-'+index);rear.position.set(x,.35,z-5.6);rear.rotation.y=Math.PI;
      facade(rear,6.6,h,[0,0,0],0,{...m,stone:mat},'facade');
      if(index===0||index===2) {
        const side=index===0?-1:1;facade(part,11.2,h,[x+side*3.3,.35,z],side*Math.PI/2,{...m,stone:mat},'facade');
      }
      box(part,[6.7,.22,.38],[x,h+.55,z+5.62],mat,'parapet');
      if(part===p.plaster) {
        for(const xx of [x-3.15,x+3.15])box(part,[.18,h,.22],[xx,h/2+.35,z+5.75],mat,'facade');
        if(index===1) {
          for(const xx of [-1.3,1.3])box(part,[.17,7.5,.3],[xx,4.1,z+5.8],mat,'entrance');
          box(part,[2.75,.18,.3],[0,7.9,z+5.8],mat,'entrance');
        }
      } else {
        // Courses stop at the actual opening rectangles.
        for(let yy=.3;yy<h;yy+=.35) {
          let intervals=[[-3.3,3.3]];
          for(const [xx,cy,w,hh]of holes)if(yy>cy-hh/2&&yy<cy+hh/2)intervals=intervals.flatMap(([a,b])=>b<=xx-w/2||a>=xx+w/2?[[a,b]]:[[a,Math.min(b,xx-w/2)],[Math.max(a,xx+w/2),b]].filter(([lo,hi])=>hi-lo>.01));
          for(const [lo,hi]of intervals)box(part,[hi-lo,.018,.018],[x+(lo+hi)/2,.35+yy,z+5.84],mortar,'masonry');
          for(let xx=-3.05+(Math.round(yy/.35)%2)*.35;xx<3.3;xx+=.7)if(!holes.some(([cx,cy,w,hh])=>Math.abs(xx-cx)<w/2&&Math.abs(yy-cy)<hh/2))box(part,[.018,.32,.018],[x+xx,.35+yy+.16,z+5.84],mortar,'masonry');
        }
      }
    }
    for(const xx of [x-3.25,x+3.25])for(const zz of [z-5.5,z+5.5])box(p.columns,[.25,h,.25],[xx,h/2+.35,zz],m.white,'structure');
    for(const yy of [4.1,h+.25]) {
      box(p.columns,[6.7,.28,11.4],[x,yy,z],m.white,'structure');
      box(p.columns,[6.1,.035,10.8],[x,yy+.16,z],m.floor,'structure');
    }
    box(p.roof,[6.75,.2,11.45],[x,h+.39,z],m.white,'roof');
    for(const zz of [z-5.6,z+5.6])box(p.roof,[6.7,.55,.18],[x,h+.75,zz],m.stone,'roof');
  }
  // The narrow unfinished vertical concrete element is left unadorned.
  box(p.tower,[.58,12.5,.62],[8.8,6.55,-5.2],m.white,'tower');
  for(const y of [3.4,7.5,10.4])box(p.tower,[.62,.11,.66],[8.8,y,-5.2],m.stone,'tower');
  // Foreground masonry boundary and inclined access echo the first photograph.
  for(const [x,w]of[[-8.4,8.2],[3.3,7.5]]) {
    box(p.ramp,[w,2.3,.24],[x,1.2,5.5],m.stone,'boundary');
    for(let y=.35;y<2.3;y+=.33)box(p.ramp,[w,.02,.025],[x,y,5.64],mortar,'masonry');
  }
  const incline=box(p.ramp,[2.7,.15,7.2],[10.6,.75,2.5],soil,'ramp');incline.rotation.x=-.15;
  for(const x of [9.1,12.1])box(p.ramp,[.2,2.3,7.4],[x,1.3,2.5],m.stone,'ramp');
  for(const x of [-11.7,11.7]) {box(p.site,[.14,4.6,.14],[x,2.3,7.8],m.dark,'site-lighting');box(p.site,[.7,.12,.3],[x,4.62,7.8],m.warm,'site-lighting');warmLight(p.site,[x,4.3,7.5],{intensity:80,distance:18});}
  for(let n=0;n<5;n++)box(p.site,[1.2,.12,.6],[-10,.12+n*.13,8.6],m.wood,'materials');
  const common=['site','base','columns','tower','ramp'];
  return finalize(root,p,m,{exterior:[...common,'blockwork','roof'],plaster:[...common,'plaster','roof'],structure:common},{
    general:preset([-28,20,35],[0,3,-1]),front:preset([0,15,43],[0,3,-1]),rear:preset([27,22,-34],[0,3,-2]),top:preset([9,40,12],[0,1,-1]),
    plaster:preset([28,16,34],[0,3,-1],'plaster'),structure:preset([-24,30,27],[0,2,-2],'structure'),
    masonry:preset([-19,13,23],[-3,3,1]),portal:preset([15,12,25],[0,4,2.5],'plaster'),tower:preset([22,18,20],[7,7,-2]),
  },{shadowSpan:27});
}

export function buildWarehouseModel() {
  const m = palette(), root = new THREE.Group(); root.name = 'Eight industrial warehouse units';
  m.stone.color.set('#e6e3d8'); m.dark.color.set('#384947');
  const steel = material('#e8ece7', { metalness: .5, roughness: .4 }), roof = material('#aab9b3', { metalness: .4, roughness: .5 }), black = material('#303734');
  const p = makeParts(root, ['site', 'foundations', 'frames', 'equipment', 'markings']);
  root.userData.warehouseUnits = [];
  box(p.site, [37, .32, 46], [0, -.13, 0], m.base, 'site'); box(p.site, [36.6, .06, 45.6], [0, .06, 0], material('#c4ad86'), 'site');
  box(p.site, [6, .025, 43], [0, .11, 0], material('#bfa781'), 'access');
  for(let z=-20;z<=20;z+=5.4)box(p.markings,[26,.1,.11],[0,.3,z],m.wood,'temporary-ties');
  for (const x of [-17.8, 17.8]) { box(p.site, [.15, 1, 44.8], [x, .58, 0], m.stone, 'boundary'); for (let z = -20; z <= 20; z += 8) bollard(p.site, x - Math.sign(x) * .6, z, m); }
  for (const [column, x] of [[0, -10], [1, 10]]) for (let row = 0; row < 4; row++) {
    const z = -16.3 + row * 10.8, id = column * 4 + row + 1;
    root.userData.warehouseUnits.push({ id, x, z });
    const f = group(p.foundations, `unit-${id}-foundations`), s = group(p.frames, `unit-${id}-steel`);
    for (const part of [f, s]) part.position.set(x, 0, z);
    box(f, [10.6, .13, 9], [0, .2, 0], m.floor, 'foundations');
    for (const xx of [-5, 5]) {
      box(f, [.28, .35, 9.2], [xx, .32, 0], black, 'waterproofing');
      for (const zz of [-4.1, -2.05, 0, 2.05, 4.1]) {
        box(f, [1.1, .22, 1.1], [xx, .23, zz], m.stone, 'footings'); box(f, [.48, .5, .48], [xx, .54, zz], black, 'waterproofing');
        // White portal frames and dark roof purlins reproduce the structural rhythm.
        box(s, [.14, 4.6, .21], [xx, 2.98, zz], steel, 'structure');
        box(s, [.3, .06, .34], [xx, .73, zz], steel, 'structure');
        beam(s, [xx, 5.28, zz], [0, 5.8, zz], .16, .21, steel, 'structure');
      }
    }
    for (const zz of [-4.1, 4.1]) box(f, [10.3, .35, .28], [0, .32, zz], black, 'waterproofing');
    for (let xx=-4.8;xx<=4.81;xx+=.6) box(s, [.065, .13, 8.9], [xx,5.8-Math.abs(xx)*.104,0],m.dark,'structure');
    for (const xx of [-5, 5]) {
      beam(s, [xx, .8, -4.05], [xx, 5.2, 4.05], .065, .065, m.dark, 'bracing');
      beam(s, [xx, .8, 4.05], [xx, 5.2, -4.05], .065, .065, m.dark, 'bracing');
      for(const zz of [-3.8,3.8])beam(f,[xx,.25,zz],[xx-Math.sign(xx)*1.3,.78,zz],.075,.075,m.wood,'formwork');
    }
    for(const zz of [-3.8,0,3.8])box(f,[10.6,.08,.09],[0,.8,zz],m.wood,'formwork');
  }
  const red=material('#99513e');
  for(const [x,z]of[[-8,6],[9,-13]]) {
    box(p.equipment,[1.45,.45,2.3],[x,.6,z],red,'site-equipment');
    for(const dx of [-.8,.8])for(const dz of [-.8,.8]) {const wheel=cylinder(p.equipment,.26,.16,[x+dx,.35,z+dz],m.dark,'site-equipment',10);wheel.rotation.z=Math.PI/2;}
    beam(p.equipment,[x,1,z],[x+1.6,3.6,z-.7],.17,.17,red,'site-equipment');box(p.equipment,[1,.25,.8],[x+1.6,3.7,z-.7],red,'site-equipment');
  }
  for(const x of [-16.5,16.5])for(const z of [-18,18]) {box(p.site,[.1,5.4,.1],[x,2.8,z],m.dark,'site-lighting');box(p.site,[.7,.12,.3],[x,5.5,z],m.warm,'site-lighting');warmLight(p.site,[x,5.2,z],{intensity:100,distance:23});}
  root.userData.photoFeatures=['eight-open-steel-units','white-portals','dense-dark-purlins','black-waterproofing','timber-braces','construction-ground'];

  return finalize(root, p, m, { exterior: ['site', 'foundations', 'frames', 'equipment', 'markings'], structure: ['site', 'foundations', 'frames', 'markings'], foundations: ['site', 'foundations', 'markings'] }, {
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
  for (const y of [.43, .63]) {
    for (let x = -5.75; x <= 5.76; x += .2) box(p.reinforcement, [.035, .035, 9.6], [x, y, 0], rebar, 'rebar');
    for (let z = -4.75; z <= 4.76; z += .2) box(p.reinforcement, [11.6, .035, .035], [0, y + .05, z], rebar, 'rebar');
  }
  for (const x of [-5.96, 5.96]) {
    for (let z = -4.8; z <= 4.81; z += .2) box(p.reinforcement, [.025, .74, .025], [x,.98,z], rebar, 'rebar');
    for (let y = .8; y <= 1.3; y += .4) box(p.reinforcement, [.035, .035, 9.65], [x, y, 0], rebar, 'rebar');
  }
  for (const z of [-4.96, 4.96]) {
    for (let x = -5.8; x <= 5.81; x += .2) box(p.reinforcement, [.025, .74, .025], [x,.98,z], rebar, 'rebar');
    for (let y = .8; y <= 1.3; y += .4) box(p.reinforcement, [11.7, .035, .035], [0, y, z], rebar, 'rebar');
  }
  box(p.membrane, [12, .04, 10], [0, .37, 0], membrane, 'waterproofing');
  for (const x of [-5.94, 5.94]) box(p.membrane, [.055, 2.45, 10], [x, 1.6, 0], membrane, 'waterproofing');
  box(p.membrane, [11.9, 2.45, .055], [0, 1.6, -4.94], membrane, 'waterproofing');
  // The near wall is a low section, leaving the membrane and junction bands visible.
  box(p.cutaway, [12.5, .65, .3], [0, .66, 5.1], concrete, 'section');
  for (const x of [-5.89, 5.89]) box(p.membrane, [.1, .12, 9.9], [x, .48, 0], seam, 'waterstop');
  box(p.membrane, [11.9, .12, .1], [0, .48, -4.88], seam, 'waterstop');
  for (let x = -5; x <= 5; x += 2) box(p.membrane, [.035, .012, 9.7], [x, .4, 0], seam, 'waterproofing');
  // Dense raised reinforcement strips, short starters and yellow site markers.
  for(const x of [-2.3,2.2])for(let z=-4.65;z<4.7;z+=.2) {
    beam(p.reinforcement,[x-.52,.68,z],[x-.25,1.05,z],.024,.024,rebar,'raised-rebar');
    box(p.reinforcement,[.5,.024,.024],[x,1.05,z],rebar,'raised-rebar');
    beam(p.reinforcement,[x+.25,1.05,z],[x+.52,.68,z],.024,.024,rebar,'raised-rebar');
  }
  for(const z of [-4.98,4.98])box(p.base,[12.3,.32,.1],[0,.69,z],m.wood,'formwork');
  for(const x of [-5.99,5.99])box(p.base,[.1,.32,10],[x,.69,0],m.wood,'formwork');
  const yellow=material('#e3be38');
  for(let z=-3.9;z<=3.9;z+=.38)for(const x of [-3.7,3.5])box(p.reinforcement,[.12,.07,.12],[x,.76,z],yellow,'markers');
  box(p.reinforcement,[1.7,.025,1.1],[3.9,.77,3.9],m.linen,'site-cover');
  for(const x of [-10,10])box(p.site,[.1,1.1,.1],[x,3.2,-8.1],m.base,'site-fence');
  box(p.site,[19.8,.9,.07],[0,3.17,-8.1],m.white,'site-fence');
  for(let x=-10;x<=10;x+=2)box(p.site,[.06,1.1,.12],[x,3.2,-8.1],m.base,'site-fence');
  for(const x of [-10,10]){box(p.site,[.12,3,.12],[x,4,-8.1],m.dark,'site-lighting');box(p.site,[.75,.18,.3],[x,5.5,-8],m.warm,'site-lighting');warmLight(p.site,[x,5.2,-7.7],{intensity:130,distance:22});}
  root.userData.photoFeatures=['open-excavation','dense-rebar-mat','raised-rebar-strips','short-starters','yellow-markers','layered-earth','site-fence'];
  return finalize(root, p, m, { exterior: ['site','base','reinforcement'], reinforcement: ['base','reinforcement'], waterproofing: ['site', 'base', 'membrane', 'cutaway'] }, {
    general: preset([26, 25, 30], [0, 1, 0]), front: preset([0, 23, 36], [0, 1, 0]), rear: preset([-26, 24, -28], [0, 1, 0]), top: preset([7, 37, 9], [0, 1, 0]),
    reinforcement: preset([18, 25, 21], [0, .8, 0], 'reinforcement'), waterproofing: preset([18, 23, 23], [0, .9, 0], 'waterproofing'),
    rebar: preset([14, 19, 18], [0, .9, 0], 'reinforcement'), junctions: preset([13, 17, 17], [0, .5, -1], 'waterproofing'), excavation: preset([23, 28, 26], [0, 1, 0]),
  }, { maxDistance: 90, shadowSpan: 24 });
}
