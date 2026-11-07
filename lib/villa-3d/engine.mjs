import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { disposeModel } from './models.mjs';
import { buildProjectModel } from './project-models.mjs';
import { createSoftwareRenderer } from './software-renderer.mjs';
import { createPresentation } from './presentation.mjs';
import { resolveViewpoint } from './viewpoints.mjs';

export async function createVillaViewer({ mount, variant, label, onView, onMode = () => {}, onFailure }) {
  const options = { antialias: true, alpha: false, powerPreference: 'default' };
  const candidate = document.createElement('canvas');
  let context;
  try { context = candidate.getContext('webgl2', options); } catch { /* Use the canvas fallback. */ }
  let renderer;
  if (context) {
    try { renderer = new THREE.WebGLRenderer({ ...options, canvas: candidate, context }); }
    catch { context.getExtension('WEBGL_lose_context')?.loseContext(); }
  }
  renderer ||= createSoftwareRenderer();
  const canvas = renderer.domElement;
  canvas.tabIndex = 0; canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', label);
  if (renderer.isWebGLRenderer) {
    canvas.dataset.renderer = 'webgl';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#e8e6df');
  const camera = new THREE.PerspectiveCamera(37, 1, .1, 500);
  const model = buildProjectModel(variant); model.setLighting(false); scene.add(model.group);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000,1000), new THREE.MeshStandardMaterial({ color: '#e8e6df', roughness: 1 }));
  ground.userData.presentationGround=true;
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.245; ground.receiveShadow = true; scene.add(ground);
  const hemi = new THREE.HemisphereLight('#ffffff', '#b3a98f', 2.5); scene.add(hemi);
  const key = new THREE.DirectionalLight('#fff1d8', 3.2); key.position.set(-15, 24, 16); key.target.position.set(0, 0, -3); scene.add(key.target); key.castShadow = true;
  const span = model.shadowSpan || 18;
  key.position.set(-span, span * 1.6, span);
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: .5, far: span * 5 });
  key.shadow.bias = -.00025; key.shadow.normalBias = .035; scene.add(key);
  const fill = new THREE.DirectionalLight('#d8e9f5', .8); fill.position.set(8, 6, -3); scene.add(fill);
  const presentation=createPresentation(scene,ground,{hemi,key,fill},renderer);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = .12;
  controls.minDistance = model.minDistance; controls.maxDistance = model.maxDistance;
  controls.minPolarAngle = .27; controls.maxPolarAngle = Math.PI / 2.02;
  // The complete building can be explored from every side.
  controls.minAzimuthAngle = -Infinity; controls.maxAzimuthAngle = Infinity;
  controls.rotateSpeed = .65; controls.zoomSpeed = .75;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  let disposed = false, visible = true, frame = 0, animation = null, fitFactor = 1, lightingNight=false;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const requestRender = () => { if (!disposed && visible && !document.hidden && !frame) frame = requestAnimationFrame(render); };
  function render(now) {
    frame = 0; if (disposed || !visible || document.hidden) return;
    if (animation) {
      const t = Math.min(1, (now - animation.start) / 420), ease = 1 - Math.pow(1 - t, 3);
      controls.target.lerpVectors(animation.targetFrom, animation.targetTo, ease);
      const orbit = new THREE.Spherical(
        THREE.MathUtils.lerp(animation.fromOrbit.radius, animation.toOrbit.radius, ease),
        THREE.MathUtils.lerp(animation.fromOrbit.phi, animation.toOrbit.phi, ease),
        animation.fromOrbit.theta + animation.angle * ease,
      );
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(orbit));
      if (t >= 1) animation = null;
    }
    const changed = controls.update(); renderer.setInteractive?.(changed||!!animation); renderer.render(scene, camera);
    if (changed || animation) requestRender();
  }
  function resize() {
    if (disposed) return;
    const { width, height } = mount.getBoundingClientRect(); if (width < 1 || height < 1) return;
    renderer.setSize(Math.round(width), Math.round(height), false);
    camera.aspect = width / height;
    const nextFit = Math.max(1, 1.05 / camera.aspect);
    if (Math.abs(nextFit - fitFactor) > .005) {
      animation = null; camera.position.sub(controls.target).multiplyScalar(nextFit / fitFactor).add(controls.target);
      fitFactor = nextFit; controls.maxDistance = model.maxDistance * fitFactor; controls.update();
    }
    camera.updateProjectionMatrix(); requestRender();
  }
  function view(name, instant = false, keepLayer = false) {
    const preset = keepLayer ? resolveViewpoint(model, name) : model.presets[name]; if (!preset || disposed) return;
    if (preset.mode && model.mode !== preset.mode) { model.setMode(preset.mode); presentation.apply(lightingNight,model.mode==='room'); renderer.invalidateScene?.(); onMode(preset.mode); }
    controls.update();
    const to = new THREE.Vector3(...preset.position), targetTo = new THREE.Vector3(...preset.target);
    to.sub(targetTo).multiplyScalar(fitFactor).add(targetTo);
    if (reduced || instant) { animation = null; camera.position.copy(to); controls.target.copy(targetTo); controls.update(); }
    else {
      const fromOrbit = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      const toOrbit = new THREE.Spherical().setFromVector3(to.clone().sub(targetTo));
      const angle = Math.atan2(Math.sin(toOrbit.theta - fromOrbit.theta), Math.cos(toOrbit.theta - fromOrbit.theta));
      animation = { start: performance.now(), fromOrbit, toOrbit, angle, targetFrom: controls.target.clone(), targetTo };
    }
    onView(name); requestRender();
  }
  function zoom(factor) {
    animation = null; const direction = camera.position.clone().sub(controls.target);
    const distance = THREE.MathUtils.clamp(direction.length() * factor, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(direction.normalize().multiplyScalar(distance)); controls.update(); requestRender();
  }
  const startInteraction = () => { animation = null; onView('free'); requestRender(); };
  controls.addEventListener('change', requestRender); controls.addEventListener('start', startInteraction);
  const onKey = event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (['+', '=', '-', '_', 'Home', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Home') return view('general');
      if (['+', '='].includes(event.key)) return zoom(.86);
      if (['-', '_'].includes(event.key)) return zoom(1.16);
      animation = null; const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      if (event.key === 'ArrowLeft') spherical.theta -= .12;
      if (event.key === 'ArrowRight') spherical.theta += .12;
      if (event.key === 'ArrowUp') spherical.phi -= .1;
      if (event.key === 'ArrowDown') spherical.phi += .1;
      spherical.theta = THREE.MathUtils.clamp(spherical.theta, controls.minAzimuthAngle, controls.maxAzimuthAngle);
      spherical.phi = THREE.MathUtils.clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical)); controls.update(); onView('free'); requestRender();
    }
  };
  canvas.addEventListener('keydown', onKey);
  const lost = event => { event.preventDefault(); if (!disposed) onFailure(); };
  canvas.addEventListener('webglcontextlost', lost);
  const observer = new ResizeObserver(resize);
  function lighting(mode) {
    const night = mode === 'night';
    lightingNight=night; presentation.apply(night,model.mode==='room');
    model.setLighting(night);
    requestRender();
  }
  function dispose() {
    if (disposed) return; disposed = true; cancelAnimationFrame(frame); observer.disconnect();
    controls.dispose(); canvas.removeEventListener('keydown', onKey); canvas.removeEventListener('webglcontextlost', lost);
    presentation.dispose(); disposeModel(scene); renderer.dispose(); canvas.remove();
  }
  try {
    mount.append(canvas); onMode('exterior'); view('general', true); observer.observe(mount); resize();
    await renderer.compileAsync(scene, camera); renderer.render(scene, camera);
  } catch (error) { dispose(); throw error; }
  return { view, viewpoint(name) { view(name, false, true); }, mode(name) { view(name==='exterior'?(model.presets.exterior?'exterior':'general'):name); }, zoom, lighting, resize, dispose, canvas, visibility(value) { visible = value; if (visible) requestRender(); else { cancelAnimationFrame(frame); frame = 0; } } };
}
