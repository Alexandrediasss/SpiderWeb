import { describe, expect, it } from 'vitest';
import { LETTER, SPIDER, TILE } from '../src/config';
import { ACTS } from '../src/level/acts';
import { HOUSE_MAP, ROOMS } from '../src/level/houseMap';
import { LETTERS } from '../src/level/letters';
import { isSolidChar } from '../src/level/legend';
import { LevelGrid } from '../src/physics/LevelGrid';
import { SpiderMotor } from '../src/systems/SpiderMotor';
import { LetterLog, letterCenter, nearbyLetter } from '../src/systems/letters';
import { DT, input } from './helpers';

const grid = LevelGrid.fromAscii(HOUSE_MAP, TILE, isSolidChar);

describe('cartas no mapa', () => {
  it('ids únicos e todas pertencem a um ato', () => {
    const ids = LETTERS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    const inActs = ACTS.flatMap((a) => a.letters);
    for (const id of ids) expect(inActs).toContain(id);
    for (const id of inActs) expect(ids).toContain(id);
  });

  it.each(LETTERS)('a carta "$id" fica num tile vazio, apoiada numa superfície, dentro de um cômodo', (l) => {
    expect(grid.isSolidTile(l.tx, l.ty)).toBe(false);
    expect(grid.isSolidTile(l.tx, l.ty + 1)).toBe(true);
    expect(ROOMS.some((r) => l.tx >= r.x0 && l.tx <= r.x1 && l.ty >= r.y0 && l.ty <= r.y1)).toBe(true);
  });

  it.each(LETTERS)('andando na superfície, a aranha chega perto o bastante para ler "$id"', (l) => {
    // Começa dois tiles à esquerda, na mesma superfície, e anda para a direita.
    expect(grid.isSolidTile(l.tx - 2, l.ty + 1)).toBe(true);
    const m = new SpiderMotor(grid, (l.tx - 2 + 0.5) * TILE, (l.ty + 1) * TILE - SPIDER.half);
    m.surface = 'floor';
    let found = false;
    for (let i = 0; i < 90 && !found; i++) {
      m.update(DT, input({ move: { x: 1, y: 0 } }));
      found = nearbyLetter(LETTERS, m.body, TILE, LETTER.readRadius)?.id === l.id;
    }
    expect(found).toBe(true);
    expect(m.surface).toBe('floor');
  });

  it('o texto existe e a 3ª é a extra', () => {
    for (const l of LETTERS) expect(l.text.length).toBeGreaterThan(40);
    expect(LETTERS.filter((l) => l.extra).map((l) => l.id)).toEqual(['attic']);
  });
});

describe('nearbyLetter', () => {
  const table = LETTERS[0];
  const c = letterCenter(table, TILE);

  it('acha a carta dentro do raio e nada fora dele', () => {
    expect(nearbyLetter(LETTERS, { x: c.x + 10, y: c.y }, TILE, 22)?.id).toBe(table.id);
    expect(nearbyLetter(LETTERS, { x: c.x + 40, y: c.y }, TILE, 22)).toBeNull();
  });

  it('com duas no raio, fica a mais perto', () => {
    const near = { ...table, id: 'a', tx: 0, ty: 0 };
    const far = { ...table, id: 'b', tx: 1, ty: 0 };
    expect(nearbyLetter([far, near], letterCenter(near, TILE), TILE, 40)?.id).toBe('a');
  });
});

describe('LetterLog', () => {
  it('conta só as cartas pedidas e não repete', () => {
    const log = new LetterLog();
    log.markRead('table');
    log.markRead('table');
    log.markRead('attic');
    expect(log.count(['table', 'bed'])).toBe(1);
    expect(log.ids.sort()).toEqual(['attic', 'table']);
    log.clear();
    expect(log.count(['table'])).toBe(0);
  });
});
