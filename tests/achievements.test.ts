import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../src/level/achievements';
import { ACTS } from '../src/level/acts';
import { LETTERS } from '../src/level/letters';
import { byAct, parseUnlocked, triggeredBy, unlock } from '../src/systems/achievements';
import { ACHIEVEMENT_ICON, buildAchievementIcon } from '../src/art/uiArt';

const ids = (list: { id: string }[]) => list.map((a) => a.id);

describe('lista de conquistas', () => {
  it('quatro no ato 1 e duas no ato 2, com ids únicos', () => {
    expect(ACHIEVEMENTS.filter((a) => a.act === 'act1').length).toBe(4);
    expect(ACHIEVEMENTS.filter((a) => a.act === 'act2').length).toBe(2);
    expect(new Set(ids(ACHIEVEMENTS)).size).toBe(ACHIEVEMENTS.length);
  });

  it('texto do jogo em inglês (sem acentos) e cada uma aponta para um ato e carta que existem', () => {
    for (const a of ACHIEVEMENTS) {
      expect(`${a.name} ${a.description}`).toMatch(/^[\x20-\x7e]+$/);
      expect(ACTS.some((act) => act.id === a.act)).toBe(true);
      const t = a.trigger;
      if (t.type === 'letterRead' && t.letter) {
        const id = t.letter;
        expect(LETTERS.some((l) => l.id === id)).toBe(true);
      }
    }
  });
});

describe('o que libera cada conquista', () => {
  it('qualquer carta do ato 1 dá THE EXPLORER; a do sótão dá também LOVE ADMIRER', () => {
    expect(ids(triggeredBy(ACHIEVEMENTS, { type: 'letterRead', act: 'act1', letter: 'table' }))).toEqual(['explorer']);
    expect(ids(triggeredBy(ACHIEVEMENTS, { type: 'letterRead', act: 'act1', letter: 'bed' }))).toEqual(['explorer']);
    expect(ids(triggeredBy(ACHIEVEMENTS, { type: 'letterRead', act: 'act1', letter: 'attic' }))).toEqual(['explorer', 'love']);
  });

  it('terminar o ato 1 dá ROOF DIGGER; terminar o ato 2 dá WEBS THROUGH THE AIR', () => {
    expect(ids(triggeredBy(ACHIEVEMENTS, { type: 'actEnd', act: 'act1' }))).toEqual(['roof']);
    expect(ids(triggeredBy(ACHIEVEMENTS, { type: 'actEnd', act: 'act2' }))).toEqual(['poles']);
    expect(triggeredBy(ACHIEVEMENTS, { type: 'actEnd', act: 'act3' })).toEqual([]);
  });

  it('matar todos os ratos do ato 1 dá RAT CONQUEROR; ser pisada no ato 2 dá HEAVY FOOT', () => {
    expect(ids(triggeredBy(ACHIEVEMENTS, { type: 'allRatsKilled', act: 'act1' }))).toEqual(['rats']);
    expect(ids(triggeredBy(ACHIEVEMENTS, { type: 'stomped', act: 'act2' }))).toEqual(['stomped']);
    expect(triggeredBy(ACHIEVEMENTS, { type: 'stomped', act: 'act1' })).toEqual([]);
  });
});

describe('conseguir e salvar', () => {
  it('avisa só as novas e não repete', () => {
    const first = unlock([], ['explorer']);
    expect(first).toEqual({ unlocked: ['explorer'], fresh: ['explorer'] });
    const again = unlock(first.unlocked, ['explorer', 'love', 'love']);
    expect(again).toEqual({ unlocked: ['explorer', 'love'], fresh: ['love'] });
  });

  it('lê o salvo com validação: estragado, outro formato ou id desconhecido viram nada', () => {
    expect(parseUnlocked(null, ACHIEVEMENTS)).toEqual([]);
    expect(parseUnlocked('{', ACHIEVEMENTS)).toEqual([]);
    expect(parseUnlocked('{"a":1}', ACHIEVEMENTS)).toEqual([]);
    expect(parseUnlocked('["roof","roof","nope",3]', ACHIEVEMENTS)).toEqual(['roof']);
  });

  it('agrupa por ato, na ordem, marcando as conseguidas', () => {
    const groups = byAct(ACHIEVEMENTS, ['love', 'poles']);
    expect(groups.map((g) => g.act)).toEqual(['act1', 'act2']);
    expect(groups[0].items.map((i) => [i.item.id, i.unlocked])).toEqual([
      ['explorer', false],
      ['love', true],
      ['roof', false],
      ['rats', false],
    ]);
    expect(groups[1].items[0].unlocked).toBe(true);
  });
});

describe('medalhas', () => {
  it('cada ícone tem o tamanho certo; conseguida e trancada são diferentes; cantos transparentes', () => {
    for (const a of ACHIEVEMENTS) {
      const on = buildAchievementIcon(a.icon, true);
      const off = buildAchievementIcon(a.icon, false);
      expect([on.width, on.height]).toEqual([ACHIEVEMENT_ICON.w, ACHIEVEMENT_ICON.h]);
      expect(on.data[3]).toBe(0);
      expect(Array.from(on.data)).not.toEqual(Array.from(off.data));
    }
    // Todas as trancadas são iguais (cadeado), para não entregar o desenho.
    const locked = ACHIEVEMENTS.map((a) => Array.from(buildAchievementIcon(a.icon, false).data).join(','));
    expect(new Set(locked).size).toBe(1);
  });
});
