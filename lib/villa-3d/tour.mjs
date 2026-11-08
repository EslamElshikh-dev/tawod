// A tour is explicit, stops on manual navigation, and respects reduced motion.
export function createOrbitTour(controls, { requestRender, onChange = () => {}, reduced = () => false }) {
  let active = false;
  controls.autoRotate = false;
  controls.autoRotateSpeed = .65;
  function set(value) {
    const next = Boolean(value) && !reduced();
    if (next === active) return;
    active = next;
    controls.autoRotate = next;
    onChange(next);
    requestRender();
  }
  return { set, stop() { set(false); }, get active() { return active; } };
}
