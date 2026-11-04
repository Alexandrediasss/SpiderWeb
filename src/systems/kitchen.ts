// A cozinha do ato 3: o doente e o lustre juntos. As teias que acertam (a corda corta; o doente fica preso
// ou ferido), os tapas e a queda do lustre (em cima do doente ou da Mary). O jogo e o resumo do ato 3 usam
// a mesma lógica; a cena só toca os sons e desenha. Lógica pura. Spec: docs/features/act3-lights-out.md
import { CHANDELIER, SHOTS, SICK } from '../config';
import type { Body } from '../physics/collide';
import type { Chandelier } from './chandelier';
import type { CombatEvent, ShotTarget } from './combat';
import type { RecapCue } from './recap';
import { type Sick, bodyBox, boxesOverlap } from './sick';

export type KitchenEvent =
  /** Gemido do doente (sozinho) e o tapa saindo. */
  | { type: 'groan' }
  | { type: 'swing' }
  /** O tapa acertou a Mary. */
  | { type: 'slap' }
  /** Uma teia acertou o doente (ele geme alto). */
  | { type: 'sickShot' }
  | { type: 'ropeCut' }
  /** O lustre bateu no chão. */
  | { type: 'crash' }
  | { type: 'sickDefeated'; byChandelier: boolean }
  /** O lustre caiu em cima da Mary. */
  | { type: 'maryCrushed' };

/** Como a cozinha ficou na jogada: a cutscene da janela mostra isso. */
export interface KitchenSnapshot {
  sickX: number;
  alive: boolean;
  /** Vivo e provocado (fica virado para a janela). */
  aggro: boolean;
  /** Morreu embaixo do lustre. */
  crushed: boolean;
  /** O lustre não está mais na corda. */
  chandelierDown: boolean;
}

export class Kitchen {
  /** Alvos das teias de combate (vão para `Combat.targets`). */
  readonly sickTarget: ShotTarget;
  readonly ropeTarget: ShotTarget;

  constructor(
    readonly sick: Sick,
    readonly chandelier: Chandelier,
  ) {
    this.sickTarget = { hitTest: (x, y) => sick.hits(x, y) };
    this.ropeTarget = { hitTest: (x, y) => chandelier.hitsRope(x, y) };
  }

  get targets(): ShotTarget[] {
    return [this.sickTarget, this.ropeTarget];
  }

  /** As teias que acertaram neste passo: a corda corta; o doente fica preso (prender) ou perde vida (ataque). */
  onCombat(events: CombatEvent[]): KitchenEvent[] {
    const out: KitchenEvent[] = [];
    for (const e of events) {
      if (e.type !== 'targetHit') continue;
      if (e.target === this.ropeTarget) {
        if (this.chandelier.cut()) out.push({ type: 'ropeCut' });
      } else if (e.target === this.sickTarget) {
        if (e.kind === 'trap') this.sick.trap();
        else if (this.sick.damage(SHOTS.damage) === 'died') out.push({ type: 'sickDefeated', byChandelier: false });
        out.push({ type: 'sickShot' });
      }
    }
    return out;
  }

  /** Um passo: o doente (atrás de `mary`; null = nada para perseguir) e o lustre caindo. */
  update(dt: number, mary: Body | null): KitchenEvent[] {
    const out: KitchenEvent[] = [];
    const sick = this.sick;
    for (const e of sick.update(dt, mary)) {
      if (e.type === 'groan') out.push({ type: 'groan' });
      else if (e.type === 'swing') out.push({ type: 'swing' });
      else if (e.type === 'hit') out.push({ type: 'slap' });
    }
    const c = this.chandelier;
    const falling = c.state === 'falling';
    if (c.update(dt)) out.push({ type: 'crash' });
    // Confere também o passo em que bate no chão (já 'fallen').
    if (falling || c.state === 'falling') {
      if (sick.alive && boxesOverlap(c.box, sick.box) && sick.crush()) out.push({ type: 'sickDefeated', byChandelier: true });
      if (mary && boxesOverlap(c.box, bodyBox(mary))) out.push({ type: 'maryCrushed' });
    }
    return out;
  }

  snapshot(): KitchenSnapshot {
    const { sick, chandelier } = this;
    return { sickX: sick.x, alive: sick.alive, aggro: sick.aggro, crushed: sick.crushed, chandelierDown: chandelier.state !== 'hanging' };
  }

  /** Deixa o doente e o lustre como na foto, já parados (o lustre caído, o doente no chão). */
  restore(s: KitchenSnapshot): void {
    const { sick, chandelier } = this;
    sick.x = s.sickX;
    if (s.chandelierDown) {
      chandelier.cut();
      chandelier.top = chandelier.def.floorY;
      chandelier.update(0);
    }
    if (!s.alive) {
      if (s.crushed) sick.crush();
      else sick.damage(sick.hp);
      sick.flashLeft = 0;
    } else if (s.aggro) {
      sick.aggro = true;
      sick.state = 'chase';
    }
  }

  /** A Mary voltou no checkpoint: o doente vivo volta ao normal e o lustre à corda. Devolve se o lustre voltou. */
  reset(): boolean {
    if (!this.sick.alive) return false;
    this.sick.reset();
    if (this.chandelier.state === 'hanging') return false;
    this.chandelier.reset();
    return true;
  }
}

/** O doente está parado embaixo do lustre (se a corda for cortada agora, a queda acerta nele). */
export function sickUnderChandelier(k: Kitchen): boolean {
  const { sick, chandelier } = k;
  const reach = (CHANDELIER.w + SICK.w) / 2 - CHANDELIER.underMarginPx;
  return sick.alive && !sick.moving && Math.abs(sick.x - chandelier.x) <= reach;
}

/** As marcas do resumo do ato 3 (src/level/recaps.ts): o doente, a corda e o lustre. */
export function kitchenCues(k: Kitchen): Record<string, RecapCue> {
  const { sick, chandelier } = k;
  const chest = { x: sick.x, y: sick.y - SICK.h * 0.6 };
  const end = chandelier.ropeEnd;
  return {
    sick: { ...chest, done: sick.aggro },
    rope: { x: (chandelier.def.x + end.x) / 2, y: (chandelier.def.y + end.y) / 2, done: chandelier.state !== 'hanging' },
    sickUnder: { x: chandelier.x, y: chandelier.box.top, done: sickUnderChandelier(k) },
    sickDead: { ...chest, done: !sick.alive },
  };
}
