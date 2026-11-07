// A viewpoint changes the camera; a layer or detail changes the displayed model.
export function resolveViewpoint(model, name) {
  const requested = model.presets[name];
  if (!requested) return undefined;
  const active = model.presets[model.mode] || (model.mode === 'exterior' ? model.presets.exterior || model.presets.general : undefined);
  if (!active) return undefined;
  if (name === 'general') return { position: [...active.position], target: [...active.target], mode: model.mode };
  const direction = requested.position.map((value, index) => value - requested.target[index]);
  const distance = Math.hypot(...active.position.map((value, index) => value - active.target[index]));
  const length = Math.hypot(...direction);
  if (!length) return undefined;
  return {
    position: active.target.map((value, index) => value + direction[index] / length * distance),
    target: [...active.target],
    mode: model.mode,
  };
}
