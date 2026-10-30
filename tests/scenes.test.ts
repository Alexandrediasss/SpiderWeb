import { describe, expect, it } from 'vitest';
import { ACTS } from '../src/level/acts';
import { SCENES } from '../src/level/scenes';
import { byAct, parseUnlocked, unlock } from '../src/systems/achievements';

describe('cenas do SCENES', () => {
  it('três por ato, na ordem da história: abertura, resumo, final', () => {
    for (const act of ['act1', 'act2']) {
      expect(SCENES.filter((s) => s.act === act).map((s) => s.kind)).toEqual(['cutscene', 'recap', 'cutscene']);
    }
    expect(new Set(SCENES.map((s) => s.id)).size).toBe(SCENES.length);
  });

  it('texto em inglês (sem acentos) e cada ato existe', () => {
    for (const s of SCENES) {
      expect(`${s.name} ${s.description}`).toMatch(/^[\x20-\x7e]+$/);
      expect(ACTS.some((a) => a.id === s.act)).toBe(true);
    }
  });

  it('vista uma vez, fica liberada; salvo estragado ou com id desconhecido é ignorado', () => {
    const seen = unlock([], ['act1-intro']).unlocked;
    expect(unlock(seen, ['act1-intro']).fresh).toEqual([]);
    expect(parseUnlocked('["act1-intro","act9-x"]', SCENES)).toEqual(['act1-intro']);
    expect(parseUnlocked('nope', SCENES)).toEqual([]);
  });

  it('agrupa por ato marcando as vistas', () => {
    const groups = byAct(SCENES, ['act1-intro', 'act1-street']);
    expect(groups.map((g) => g.act)).toEqual(['act1', 'act2']);
    expect(groups[0].items.map((i) => i.unlocked)).toEqual([true, false, true]);
    expect(groups[1].items.every((i) => !i.unlocked)).toBe(true);
  });
});
