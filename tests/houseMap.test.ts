import { describe, expect, it } from 'vitest';
import { TILE } from '../src/config';
import { HOUSE_MAP, SPAWN } from '../src/level/houseMap';
import { isSolidChar } from '../src/level/legend';
import { LevelGrid } from '../src/physics/LevelGrid';

describe('mapa da casa', () => {
  it('todas as linhas têm o mesmo tamanho e só usam caracteres da legenda', () => {
    expect(() => LevelGrid.fromAscii(HOUSE_MAP, TILE, isSolidChar)).not.toThrow();
  });

  it('o spawn está num tile vazio', () => {
    const grid = LevelGrid.fromAscii(HOUSE_MAP, TILE, isSolidChar);
    expect(grid.isSolidTile(SPAWN.tx, SPAWN.ty)).toBe(false);
  });
});
