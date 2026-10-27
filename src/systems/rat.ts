// Rato: patrulha um trecho do chão, persegue a aranha quando a vê e morde. Lógica pura.
// Spec: docs/features/combat.md
import { RAT, SHOTS } from '../config';
import type { RatSpawn } from '../level/houseMap';
import type { LevelGrid } from '../physics/LevelGrid';
import { type Body, moveAndCollide } from '../physics/collide';
import type { Vec2 } from '../physics/surfaces';
import { makeRng } from './storm';

export type RatState = 'patrol' | 'chase' | 'hurt' | 'trapped' | 'dead';

export type RatEvent = { type: 'bite' } | { type: 'spotted' };

export type DamageResult = 'hurt' | 'died' | 'ignored';

export class Rat {
  readonly body: Body;
  readonly name: string;
  state: RatState = 'patrol';
  hp = RAT.hp;
  /** Para onde olha: 1 = direita, -1 = esquerda. */
  facing = 1;
  /** Andando neste frame (para a animação). */
  moving = false;
  /** > 0 durante o "bote" antes da mordida (s restantes). */
  windup = 0;
  /** Segundos restantes presos na teia. */
  trappedLeft = 0;
  /** Segundos desde a morte. */
  deadFor = 0;
  /** > 0 logo depois de levar dano (pisca vermelho). */
  flashLeft = 0;

  private readonly minX: number;
  private readonly maxX: number;
  private dir: number;
  private pauseLeft = 0;
  private hurtLeft = 0;
  private biteCooldown = 0;
  private jumpCooldown = 0;
  private sinceSeen = Infinity;
  private onGround = false;
  private readonly rng: () => number;

  constructor(spawn: RatSpawn, tile: number, seed: number) {
    this.name = spawn.name;
    this.body = { x: (spawn.tx + 0.5) * tile, y: (spawn.ty + 1) * tile - RAT.half, vx: 0, vy: 0, half: RAT.half };
    this.minX = (spawn.minTx + 0.5) * tile;
    this.maxX = (spawn.maxTx + 0.5) * tile;
    this.rng = makeRng(seed);
    this.dir = this.rng() < 0.5 ? -1 : 1;
    this.facing = this.dir;
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }

  /** Terminou a animação de morte: pode sumir. */
  get gone(): boolean {
    return this.state === 'dead' && this.deadFor >= RAT.deathSec;
  }

  /** `target`: centro da aranha, ou null se não há o que perseguir (aranha morta). */
  update(dt: number, grid: LevelGrid, target: Vec2 | null): RatEvent[] {
    const events: RatEvent[] = [];
    const b = this.body;
    this.flashLeft = Math.max(0, this.flashLeft - dt);
    this.biteCooldown = Math.max(0, this.biteCooldown - dt);
    this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);
    b.vy = Math.min(b.vy + RAT.gravity * dt, 420);

    if (this.state === 'dead') {
      this.deadFor += dt;
      b.vx *= 0.9;
      this.move(dt, grid);
      return events;
    }

    if (this.state === 'trapped') {
      this.trappedLeft -= dt;
      b.vx = 0;
      if (this.trappedLeft <= 0) this.state = this.sinceSeen < RAT.forgetSec ? 'chase' : 'patrol';
      this.move(dt, grid);
      return events;
    }

    if (this.state === 'hurt') {
      this.hurtLeft -= dt;
      if (this.onGround) b.vx *= 0.85;
      if (this.hurtLeft <= 0) this.state = 'chase';
      this.move(dt, grid);
      return events;
    }

    const sees = target !== null && this.canSee(grid, target);
    if (sees) {
      this.sinceSeen = 0;
      if (this.state === 'patrol') {
        this.state = 'chase';
        events.push({ type: 'spotted' });
      }
    } else {
      this.sinceSeen += dt;
      if (this.state === 'chase' && (target === null || this.sinceSeen > RAT.forgetSec)) {
        this.state = 'patrol';
        this.windup = 0;
      }
    }

    if (this.state === 'chase' && target) this.chase(dt, grid, target, events);
    else this.patrol(dt, grid);

    this.move(dt, grid);
    return events;
  }

  /** Teia de ataque: tira vida, empurra e atordoa. Preso na teia, só tira vida (não sai voando). */
  damage(amount: number, fromX: number): DamageResult {
    if (this.state === 'dead') return 'ignored';
    const b = this.body;
    const away = Math.sign(b.x - fromX) || 1;
    this.hp -= amount;
    this.flashLeft = 0.25;
    this.sinceSeen = 0;
    this.windup = 0;
    if (this.hp <= 0) {
      this.state = 'dead';
      this.deadFor = 0;
      b.vx = away * 60;
      b.vy = -140;
      return 'died';
    }
    if (this.state !== 'trapped') {
      this.state = 'hurt';
      this.hurtLeft = RAT.hurtSec;
      b.vx = away * RAT.knockbackX;
      b.vy = -RAT.knockbackY;
    }
    return 'hurt';
  }

  /** Teia que prende: fica parado por `SHOTS.trapSec` (prender de novo renova o tempo). */
  trap(): boolean {
    if (this.state === 'dead') return false;
    this.state = 'trapped';
    this.trappedLeft = SHOTS.trapSec;
    this.windup = 0;
    this.body.vx = 0;
    return true;
  }

  // ---------- comportamento ----------

  private patrol(dt: number, grid: LevelGrid): void {
    const b = this.body;
    this.windup = 0;
    if (this.pauseLeft > 0) {
      this.pauseLeft -= dt;
      b.vx = 0;
      return;
    }
    const pastEnd = (this.dir > 0 && b.x >= this.maxX) || (this.dir < 0 && b.x <= this.minX);
    if (pastEnd || this.blockedAhead(grid, this.dir)) {
      this.dir = -this.dir;
      const [min, max] = RAT.patrolPauseSec;
      this.pauseLeft = min + this.rng() * (max - min);
      b.vx = 0;
      return;
    }
    this.facing = this.dir;
    b.vx = this.dir * RAT.patrolSpeed;
  }

  private chase(dt: number, grid: LevelGrid, target: Vec2, events: RatEvent[]): void {
    const b = this.body;
    const dx = target.x - b.x;
    const dy = target.y - b.y;
    if (Math.abs(dx) > 3) this.dir = Math.sign(dx);
    this.facing = this.dir;
    const inReach = Math.abs(dx) <= RAT.biteReachX && Math.abs(dy) <= RAT.biteReachY;

    // Mordida: um "bote" curto (o jogador vê e pode fugir) e só então o dano, se ainda estiver perto.
    if (this.windup > 0) {
      this.windup -= dt;
      b.vx = 0;
      if (this.windup <= 0) {
        this.biteCooldown = RAT.biteCooldownSec;
        if (inReach) events.push({ type: 'bite' });
      }
      return;
    }
    if (inReach && this.biteCooldown <= 0) {
      this.windup = RAT.biteWindupSec;
      b.vx = 0;
      return;
    }

    // Pulinho se a aranha estiver logo acima (numa parede baixa, por exemplo).
    if (this.onGround && this.jumpCooldown <= 0 && dy < -RAT.biteReachY && dy > -60 && Math.abs(dx) < 28) {
      b.vy = -RAT.jumpSpeed;
      this.jumpCooldown = RAT.jumpCooldownSec;
    }

    const leashMin = this.minX - RAT.leashPx;
    const leashMax = this.maxX + RAT.leashPx;
    const leashed = (this.dir > 0 && b.x >= leashMax) || (this.dir < 0 && b.x <= leashMin);
    const close = Math.abs(dx) <= RAT.biteReachX * 0.6;
    b.vx = leashed || close || this.blockedAhead(grid, this.dir) ? 0 : this.dir * RAT.chaseSpeed;
  }

  /** Enxerga a aranha? Na frente dele (ou bem perto), dentro do alcance e sem nada sólido no caminho. */
  canSee(grid: LevelGrid, t: Vec2): boolean {
    const b = this.body;
    const dx = t.x - b.x;
    const dy = t.y - b.y;
    if (Math.abs(dy) > RAT.sightHeight) return false;
    const d = Math.hypot(dx, dy);
    if (d > RAT.sightRange) return false;
    if (d > RAT.noticeRange && Math.sign(dx) !== this.facing) return false;
    const eyeY = b.y - 2;
    return grid.firstSolidDistance(b.x, eyeY, t.x, t.y) >= Math.hypot(dx, t.y - eyeY) - 1;
  }

  /** Parede na frente ou beirada (sem chão à frente): não anda para lá. */
  private blockedAhead(grid: LevelGrid, dir: number): boolean {
    const b = this.body;
    const front = b.x + dir * (b.half + 1);
    if (grid.isSolidPixel(front, b.y)) return true;
    return this.onGround && !grid.isSolidPixel(front, b.y + b.half + 1);
  }

  private move(dt: number, grid: LevelGrid): void {
    const b = this.body;
    const hit = moveAndCollide(grid, b, b.vx * dt, b.vy * dt);
    this.onGround = hit.y > 0;
    if (hit.x !== 0 && this.state === 'patrol') this.dir = -hit.x;
    this.moving = Math.abs(b.vx) > 1 && this.onGround;
  }
}
