import { describe, expect, it } from 'vitest';
import { SICK } from '../src/config';
import { CHANDELIER_DEF, SICK_DEF } from '../src/level/neighborHouse';
import type { Body } from '../src/physics/collide';
import { Chandelier } from '../src/systems/chandelier';
import type { CombatEvent } from '../src/systems/combat';
import { Kitchen, kitchenCues, sickUnderChandelier } from '../src/systems/kitchen';
import { Sick } from '../src/systems/sick';
import { DT } from './helpers';

function kitchen(): Kitchen {
  return new Kitchen(new Sick(SICK_DEF, 1), new Chandelier(CHANDELIER_DEF));
}

function hit(k: Kitchen, target: 'sick' | 'rope', kind: 'attack' | 'trap' = 'attack'): CombatEvent[] {
  return [{ type: 'targetHit', target: target === 'sick' ? k.sickTarget : k.ropeTarget, kind, x: 0, y: 0 }];
}

/** A Mary no teto da cozinha, longe do alcance do doente. */
const onCeiling = (x: number): Body => ({ x, y: CHANDELIER_DEF.y + 5, vx: 0, vy: 0, half: 5 });

describe('cozinha do ato 3 (o doente e o lustre)', () => {
  it('teia de ataque fere e deixa bravo; de prender segura', () => {
    const k = kitchen();
    expect(k.onCombat(hit(k, 'sick')).map((e) => e.type)).toEqual(['sickShot']);
    expect(k.sick.aggro).toBe(true);
    expect(k.sick.hp).toBe(SICK.hp - 1);
    k.onCombat(hit(k, 'sick', 'trap'));
    expect(k.sick.state).toBe('trapped');
  });

  it('a última teia mata (sem o lustre)', () => {
    const k = kitchen();
    k.sick.hp = 1;
    expect(k.onCombat(hit(k, 'sick'))).toContainEqual({ type: 'sickDefeated', byChandelier: false });
  });

  it('cortar a corda com o doente embaixo: o lustre cai nele e ele morre', () => {
    const k = kitchen();
    k.sick.x = CHANDELIER_DEF.x;
    expect(k.onCombat(hit(k, 'rope')).map((e) => e.type)).toEqual(['ropeCut']);
    const events = [];
    for (let i = 0; i < 120; i++) events.push(...k.update(DT, onCeiling(CHANDELIER_DEF.x - 40)).map((e) => e.type));
    expect(events).toContain('sickDefeated');
    expect(events).toContain('crash');
    expect(events).not.toContain('maryCrushed');
    expect(k.sick.crushed).toBe(true);
  });

  it('o lustre caindo em cima da Mary avisa', () => {
    const k = kitchen();
    k.sick.x = SICK_DEF.maxX;
    k.onCombat(hit(k, 'rope'));
    const mary: Body = { x: CHANDELIER_DEF.x, y: CHANDELIER_DEF.floorY - 5, vx: 0, vy: 0, half: 5 };
    const events = [];
    for (let i = 0; i < 120; i++) events.push(...k.update(DT, mary).map((e) => e.type));
    expect(events).toContain('maryCrushed');
  });

  it('reset: o doente vivo volta ao normal e o lustre volta para a corda', () => {
    const k = kitchen();
    k.onCombat([...hit(k, 'sick'), ...hit(k, 'rope')]);
    expect(k.reset()).toBe(true);
    expect(k.sick.aggro).toBe(false);
    expect(k.chandelier.state).toBe('hanging');
    // Morto, fica morto (e o lustre caído continua no chão).
    k.sick.crush();
    k.chandelier.cut();
    expect(k.reset()).toBe(false);
    expect(k.chandelier.state).toBe('falling');
  });

  it('foto da cozinha: sem mexer, o doente segue andando e o lustre na corda', () => {
    const shot = kitchen();
    shot.sick.x = 300;
    const k = kitchen();
    k.restore(shot.snapshot());
    expect([k.sick.x, k.sick.state, k.sick.aggro, k.chandelier.state]).toEqual([300, 'patrol', false, 'hanging']);
  });

  it('foto da cozinha: provocado continua bravo; derrotado com teias fica no chão', () => {
    const angry = kitchen();
    angry.onCombat(hit(angry, 'sick'));
    const a = kitchen();
    a.restore(angry.snapshot());
    expect([a.sick.alive, a.sick.aggro, a.sick.state]).toEqual([true, true, 'chase']);

    const beaten = kitchen();
    beaten.sick.hp = 1;
    beaten.onCombat(hit(beaten, 'sick'));
    const b = kitchen();
    b.restore(beaten.snapshot());
    expect([b.sick.alive, b.sick.crushed, b.sick.flashLeft, b.chandelier.state]).toEqual([false, false, 0, 'hanging']);
  });

  it('foto da cozinha: esmagado fica embaixo do lustre quebrado', () => {
    const k0 = kitchen();
    k0.sick.x = CHANDELIER_DEF.x;
    k0.onCombat(hit(k0, 'rope'));
    for (let i = 0; i < 120; i++) k0.update(DT, null);
    const k = kitchen();
    k.restore(k0.snapshot());
    expect([k.sick.alive, k.sick.crushed, k.chandelier.state]).toEqual([false, true, 'fallen']);
    expect(k.chandelier.box.bottom).toBe(CHANDELIER_DEF.floorY);
  });

  it('marcas do resumo: bravo, corda cortada, parado embaixo do lustre, morto', () => {
    const k = kitchen();
    let cues = kitchenCues(k);
    expect([cues.sick.done, cues.rope.done, cues.sickDead.done]).toEqual([false, false, false]);
    expect(cues.rope.y).toBeGreaterThan(CHANDELIER_DEF.y);
    // Bravo, ele anda até ficar embaixo da Mary, que está no teto ao lado do lustre.
    k.onCombat(hit(k, 'sick'));
    for (let i = 0; i < 60 * 15 && !sickUnderChandelier(k); i++) k.update(DT, onCeiling(CHANDELIER_DEF.x - 8));
    cues = kitchenCues(k);
    expect(cues.sick.done).toBe(true);
    expect(cues.sickUnder.done).toBe(true);
    k.onCombat(hit(k, 'rope'));
    expect(kitchenCues(k).rope.done).toBe(true);
    for (let i = 0; i < 120; i++) k.update(DT, onCeiling(CHANDELIER_DEF.x - 8));
    expect(kitchenCues(k).sickDead.done).toBe(true);
  });
});
