// O doente da cozinha (ato 3). Passivo: os doentes não atacam animais nem insetos. Uma teia acertou nele:
// fica bravo para sempre, persegue a Mary pelo chão e dá tapas. Lógica pura.
// Spec: docs/features/act3-lights-out.md
import { SHOTS, SICK } from '../config';
import type { Body } from '../physics/collide';
import { makeRng } from './storm';

/** Onde ele fica: pés no chão em `floorY`, nascendo em `x` e andando entre `minX` e `maxX` (px). */
export interface SickDef {
  x: number;
  floorY: number;
  minX: number;
  maxX: number;
}

export type SickState = 'patrol' | 'chase' | 'windup' | 'swing' | 'trapped' | 'dead';

/** `swing`: o tapa saiu (acertando ou não); `hit`: acertou a Mary. */
export type SickEvent = { type: 'groan' } | { type: 'windup' } | { type: 'swing' } | { type: 'hit' };

export type SickDamage = 'hurt' | 'died' | 'ignored';

export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function bodyBox(b: Body): Box {
  return { left: b.x - b.half, right: b.x + b.half, top: b.y - b.half, bottom: b.y + b.half };
}

export class Sick {
  /** Centro em x e os pés em y. */
  x: number;
  readonly y: number;
  hp = SICK.hp;
  state: SickState = 'patrol';
  /** Provocado (uma teia acertou): não volta mais a ser passivo. */
  aggro = false;
  facing = 1;
  /** Andando neste quadro (para a animação). */
  moving = false;
  /** Bravo, com a Mary acima do alcance: fica esticando o braço. */
  reaching = false;
  flashLeft = 0;
  trappedLeft = 0;
  deadFor = 0;
  /** Segundos no estado atual (bote e tapa). */
  stateT = 0;
  /** Morreu esmagado pelo lustre? */
  crushed = false;

  private dir: number;
  private pauseLeft = 0;
  private cooldown = 0;
  private groanLeft: number;
  private readonly rng: () => number;

  constructor(
    readonly def: SickDef,
    seed: number,
  ) {
    this.rng = makeRng(seed);
    this.x = def.x;
    this.y = def.floorY;
    this.dir = this.rng() < 0.5 ? -1 : 1;
    this.facing = this.dir;
    this.groanLeft = this.between(SICK.groanGapSec);
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }

  get box(): Box {
    return { left: this.x - SICK.w / 2, right: this.x + SICK.w / 2, top: this.y - SICK.h, bottom: this.y };
  }

  /** O alcance do tapa: na frente dele, do chão até `reachUp` acima dos pés. */
  get reachBox(): Box {
    const front = this.facing > 0 ? { left: this.x - 4, right: this.x + SICK.reachX } : { left: this.x - SICK.reachX, right: this.x + 4 };
    return { ...front, top: this.y - SICK.reachUp, bottom: this.y };
  }

  /** Uma teia em (x, y) acerta nele? */
  hits(x: number, y: number): boolean {
    const b = this.box;
    return this.alive && x >= b.left - 1 && x <= b.right + 1 && y >= b.top && y <= b.bottom;
  }

  /** `target`: a caixa da Mary, ou null se não há o que perseguir (ela morreu). */
  update(dt: number, target: Body | null): SickEvent[] {
    const events: SickEvent[] = [];
    this.flashLeft = Math.max(0, this.flashLeft - dt);
    this.moving = false;
    this.reaching = false;
    if (this.state === 'dead') {
      this.deadFor += dt;
      return events;
    }
    this.groanLeft -= dt;
    if (this.groanLeft <= 0) {
      events.push({ type: 'groan' });
      this.groanLeft = this.between(SICK.groanGapSec) * (this.aggro ? 0.6 : 1);
    }
    this.cooldown = Math.max(0, this.cooldown - dt);

    switch (this.state) {
      case 'trapped':
        this.trappedLeft -= dt;
        if (this.trappedLeft <= 0) this.state = this.aggro ? 'chase' : 'patrol';
        break;
      case 'windup':
        this.stateT += dt;
        if (this.stateT >= SICK.windupSec) {
          this.state = 'swing';
          this.stateT = 0;
          events.push({ type: 'swing' });
          if (target && boxesOverlap(this.reachBox, bodyBox(target))) events.push({ type: 'hit' });
        }
        break;
      case 'swing':
        this.stateT += dt;
        if (this.stateT >= SICK.swingSec) {
          this.state = 'chase';
          this.cooldown = SICK.cooldownSec;
        }
        break;
      case 'patrol':
        this.patrol(dt);
        break;
      case 'chase':
        this.chase(dt, target, events);
        break;
    }
    return events;
  }

  private patrol(dt: number): void {
    if (this.pauseLeft > 0) {
      this.pauseLeft -= dt;
      return;
    }
    this.facing = this.dir;
    this.walk(this.dir * SICK.idleSpeed * dt);
    this.moving = true;
    const { minX, maxX } = this.def;
    if ((this.dir < 0 && this.x <= minX) || (this.dir > 0 && this.x >= maxX)) {
      this.dir = -this.dir;
      this.pauseLeft = this.between(SICK.pauseSec);
    }
  }

  private chase(dt: number, target: Body | null, events: SickEvent[]): void {
    if (!target) return;
    const dx = target.x - this.x;
    if (Math.abs(dx) > 2) this.facing = Math.sign(dx);
    if (boxesOverlap(this.reachBox, bodyBox(target))) {
      if (this.cooldown <= 0) {
        this.state = 'windup';
        this.stateT = 0;
        events.push({ type: 'windup' });
      }
      return;
    }
    // Embaixo dela (fora do alcance, lá em cima): para e estica o braço.
    if (Math.abs(dx) < SICK.reachX * 0.6) {
      this.reaching = target.y < this.y - SICK.reachUp;
      return;
    }
    const before = this.x;
    this.walk(Math.sign(dx) * SICK.chaseSpeed * dt);
    this.moving = this.x !== before;
  }

  private walk(dx: number): void {
    this.x = Math.max(this.def.minX, Math.min(this.def.maxX, this.x + dx));
  }

  /** Teia de ataque: tira vida e deixa bravo. */
  damage(amount = SHOTS.damage): SickDamage {
    if (!this.alive) return 'ignored';
    this.aggro = true;
    this.hp = Math.max(0, this.hp - amount);
    this.flashLeft = SICK.flashSec;
    if (this.hp === 0) {
      this.die();
      return 'died';
    }
    if (this.state === 'patrol') this.state = 'chase';
    return 'hurt';
  }

  /** Teia de prender: segura parado e deixa bravo. */
  trap(): boolean {
    if (!this.alive) return false;
    this.aggro = true;
    this.state = 'trapped';
    this.trappedLeft = SICK.trapSec;
    return true;
  }

  /** O lustre caiu em cima: morre na hora. */
  crush(): boolean {
    if (!this.alive) return false;
    this.hp = 0;
    this.crushed = true;
    this.die();
    return true;
  }

  /** A Mary morreu na briga e voltou no checkpoint: ele volta ao normal (se estiver vivo). */
  reset(): void {
    if (!this.alive) return;
    this.x = this.def.x;
    this.hp = SICK.hp;
    this.aggro = false;
    this.state = 'patrol';
    this.flashLeft = 0;
    this.cooldown = 0;
    this.pauseLeft = 0;
  }

  private die(): void {
    this.state = 'dead';
    this.deadFor = 0;
    this.moving = false;
  }

  private between([min, max]: readonly [number, number]): number {
    return min + this.rng() * (max - min);
  }
}
