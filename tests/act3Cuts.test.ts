import { describe, expect, it } from 'vitest';
import { CHIMNEY_CUT, WINDOW_CUT } from '../src/config';
import { ARRIVAL_ACTING, DIALOGUES } from '../src/level/dialogues';
import { CHIMNEY_BREACH } from '../src/level/neighborHouse';
import {
  CHIMNEY_STEPS,
  CHIMNEY_STEP_SHOT,
  TALK_MARK_SEC,
  WINDOW_STEPS,
  WINDOW_STEP_SHOT,
  burstPose,
  ease,
  hitsBetween,
  shaftScroll,
  shaftSide,
  threadDrop,
} from '../src/systems/act3Cuts';
import { Timeline } from '../src/systems/cutscene';

describe('etapas das cutscenes do ato 3', () => {
  it('toda etapa tem um plano e nenhuma tem duração zero (a linha do tempo pularia ela)', () => {
    for (const s of CHIMNEY_STEPS) {
      expect(CHIMNEY_STEP_SHOT[s.name], s.name).toBeDefined();
      expect(s.sec).toBeGreaterThan(0);
    }
    for (const s of WINDOW_STEPS) {
      expect(WINDOW_STEP_SHOT[s.name], s.name).toBeDefined();
      expect(s.sec).toBeGreaterThan(0);
    }
  });

  it('a marca da fala dura mais que o maior quadro (a linha do tempo não pula por cima dela)', () => {
    expect(TALK_MARK_SEC).toBeGreaterThan(1 / 30);
  });

  it('a fala vem antes do fim da chegada; a casa inteira é o último plano do fim', () => {
    const names = CHIMNEY_STEPS.map((s) => s.name);
    expect(names.indexOf('talk')).toBe(names.length - 2);
    expect(WINDOW_STEPS.slice(-2).map((s) => s.name)).toEqual(['wide', 'outro']);
  });

  it('a linha do tempo diz onde cada etapa começa', () => {
    const tl = new Timeline(CHIMNEY_STEPS);
    expect(tl.startOf('dark')).toBe(0);
    expect(tl.startOf('fall')).toBe(CHIMNEY_CUT.darkSec);
    expect(tl.at(tl.startOf('look') + 0.001)?.name).toBe('look');
    expect(tl.at(tl.startOf('talk') + 0.001)?.name).toBe('talk');
    expect(() => tl.startOf('nope')).toThrow();
  });

  it('uma atuação para cada linha da primeira fala', () => {
    expect(ARRIVAL_ACTING.length).toBe(DIALOGUES.arrival.length);
  });
});

describe('a queda na chaminé', () => {
  const hits = CHIMNEY_CUT.wallHits;

  it('as batidas acontecem durante a queda, cada vez mais rápidas', () => {
    expect(hits[hits.length - 1]).toBeLessThan(CHIMNEY_CUT.fallSec);
    for (let i = 2; i < hits.length; i++) expect(hits[i] - hits[i - 1]).toBeLessThanOrEqual(hits[i - 1] - hits[i - 2] + 1e-9);
  });

  it('sai do meio, bate numa parede de cada vez e nunca passa delas', () => {
    expect(shaftSide(0, hits)).toBe(0);
    hits.forEach((h, i) => expect(shaftSide(h, hits)).toBeCloseTo(i % 2 === 0 ? 1 : -1));
    for (let t = 0; t < CHIMNEY_CUT.fallSec + 1; t += 0.01) expect(Math.abs(shaftSide(t, hits))).toBeLessThanOrEqual(1);
  });

  it('conta cada batida uma vez só, em quadros seguidos', () => {
    let total = 0;
    for (let t = 0; t < CHIMNEY_CUT.fallSec; t += 1 / 60) total += hitsBetween(t, t + 1 / 60, hits);
    expect(total).toBe(hits.length);
  });

  it('os tijolos passam cada vez mais rápido', () => {
    const { scrollSpeed: v, scrollAccel: a } = CHIMNEY_CUT;
    expect(shaftScroll(0, v, a)).toBe(0);
    expect(shaftScroll(2, v, a) - shaftScroll(1, v, a)).toBeGreaterThan(shaftScroll(1, v, a) - shaftScroll(0, v, a));
  });
});

describe('o voo pela abertura da chaminé', () => {
  const { burstFromHeight: h, burstArcs: arcs } = CHIMNEY_CUT;
  const fromX = CHIMNEY_BREACH.x + 8;
  const toX = fromX - 60;

  it('começa na abertura e termina parada no chão, de barriga para cima', () => {
    const a = burstPose(0, fromX, h, toX, arcs);
    expect(a.x).toBeCloseTo(fromX);
    expect(a.height).toBeCloseTo(h);
    const b = burstPose(1, fromX, h, toX, arcs);
    expect(b.x).toBeCloseTo(toX);
    expect(b.height).toBeCloseTo(0);
    expect(((b.angle % 360) + 360) % 360).toBeCloseTo(180);
  });

  it('sempre para o mesmo lado e nunca entra no chão', () => {
    let last = fromX;
    for (let p = 0; p <= 1; p += 0.005) {
      const pose = burstPose(p, fromX, h, toX, arcs);
      expect(pose.x).toBeLessThanOrEqual(last + 1e-6);
      expect(pose.height).toBeGreaterThanOrEqual(0);
      last = pose.x;
    }
  });

  it('encosta no chão entre um arco e outro (é o quique)', () => {
    expect(burstPose(0.5, fromX, h, toX, arcs).height).toBeCloseTo(0);
    expect(burstPose(0.82, fromX, h, toX, arcs).height).toBeCloseTo(0);
  });
});

describe('a Mary descendo no fio', () => {
  it('chega no chão no ponto certo da etapa e fica lá', () => {
    const at = WINDOW_CUT.threadEndAt;
    expect(threadDrop(0, at)).toBe(0);
    expect(threadDrop(at, at)).toBeCloseTo(1);
    expect(threadDrop(1, at)).toBe(1);
    expect(threadDrop(at / 2, at)).toBeLessThan(0.5);
  });
});

describe('ease', () => {
  it('vai de 0 a 1 sem passar', () => {
    expect(ease(-1)).toBeCloseTo(0);
    expect(ease(0.5)).toBeCloseTo(0.5);
    expect(ease(2)).toBeCloseTo(1);
  });
});
