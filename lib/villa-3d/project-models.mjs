import { buildVillaModel } from './models.mjs';
import { buildAroubaModel, buildWarehouseModel, buildTankModel } from './site-models.mjs';

export function buildProjectModel(variant) {
  if (variant === 'arouba') return buildAroubaModel();
  if (variant === 'warehouses') return buildWarehouseModel();
  if (variant === 'tanks') return buildTankModel();
  return buildVillaModel(variant);
}
