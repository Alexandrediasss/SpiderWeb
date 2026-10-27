// Tudo que é gerado a partir do mapa (cenário, máscara do lado de fora, luz). Calculado uma vez e guardado.
import { TILE } from '../config';
import { DECORATIONS, HOUSE_MAP, ROOMS } from '../level/houseMap';
import { isSolidChar } from '../level/legend';
import { LevelGrid } from '../physics/LevelGrid';
import type { Vec2 } from '../physics/surfaces';
import { lampBulb, windowCenter } from './decorArt';
import { type BakedLevel, bakeLevel } from './levelBaker';
import { type LightMaps, buildLightMaps } from './lighting';

export interface LevelArt extends BakedLevel, LightMaps {
  grid: LevelGrid;
  /** Posição de cada lâmpada (mesma ordem de `beams`). */
  lamps: Vec2[];
}

let cache: LevelArt | null = null;

export function getLevelArt(): LevelArt {
  if (cache) return cache;
  const grid = LevelGrid.fromAscii(HOUSE_MAP, TILE, isSolidChar);
  const baked = bakeLevel(HOUSE_MAP, ROOMS, DECORATIONS);
  const lamps = DECORATIONS.filter((d) => d.kind === 'lamp').map(lampBulb);
  const windows = DECORATIONS.map(windowCenter).filter((w): w is Vec2 => w !== null);
  cache = { ...baked, ...buildLightMaps(grid, baked.outside, lamps, windows), grid, lamps };
  return cache;
}
