// Estado e regras de movimento da aranha. Lógica pura: o Phaser só lê este estado para desenhar.
// Specs: docs/features/surface-movement.md e docs/features/web-swing.md
import { AIR, SPIDER, WEB } from '../config';
import type { LevelGrid } from '../physics/LevelGrid';
import { type Body, moveAndCollide, overlapsSolid } from '../physics/collide';
import { type Surface, type Vec2, SURFACES, surfaceFacing } from '../physics/surfaces';
import type { SpiderInput } from './input';
import { hasSupport, inputToDir, walkAlongSurface } from './surfaceMovement';
import { type Rope, applyRopeConstraint, raycastWeb } from './webRope';

interface InputLock {
  dir: number;
  key: string;
}

export interface ShotFlash {
  from: Vec2;
  to: Vec2;
  timeLeft: number;
}

export class SpiderMotor {
  readonly body: Body;
  surface: Surface = 'air';
  /** Direção atual de caminhada no espaço da tangente (0 = parada). */
  dir = 0;
  /** Para onde o sprite olha: 1 ou -1. */
  facing = 1;
  running = false;
  rope: Rope | null = null;
  /** Risco visual de uma teia que errou o alvo. */
  shotFlash: ShotFlash | null = null;

  private stickCooldown = 0;
  private lock: InputLock | null = null;

  constructor(
    private readonly grid: LevelGrid,
    x: number,
    y: number,
  ) {
    this.body = { x, y, vx: 0, vy: 0, half: SPIDER.half };
  }

  get isWalking(): boolean {
    return this.surface !== 'air' && this.dir !== 0;
  }

  update(dt: number, input: SpiderInput): void {
    this.stickCooldown = Math.max(0, this.stickCooldown - dt);
    this.running = input.run;
    if (this.shotFlash) {
      this.shotFlash.timeLeft -= dt;
      if (this.shotFlash.timeLeft <= 0) this.shotFlash = null;
    }

    if (input.webPressed) this.shootWeb(input.aim);
    if (this.rope && !input.webHeld) this.rope = null;

    if (this.surface === 'air') this.updateAir(dt, input);
    else this.updateAttached(dt, input);
  }

  // ---------- grudada numa superfície ----------

  private updateAttached(dt: number, input: SpiderInput): void {
    if (this.surface === 'air') return;
    this.dir = this.resolveDir(input.move);

    if (input.jumpPressed) {
      this.jump();
      return;
    }
    if (this.dir === 0) return;

    const speed = this.running ? SPIDER.runSpeed : SPIDER.walkSpeed;
    const result = walkAlongSurface(this.grid, this.body, this.surface, this.dir, speed * dt, SPIDER.stepPx);
    if (result.turnedCorner) this.lock = { dir: this.dir, key: inputKey(input.move) };
    this.surface = result.surface;
    this.facing = this.dir;
    if (this.surface === 'air') {
      this.body.vx = 0;
      this.body.vy = 0;
    }
  }

  private resolveDir(move: Vec2): number {
    if (this.surface === 'air') return 0;
    const key = inputKey(move);
    if (this.lock && this.lock.key === key && key !== '0,0') return this.lock.dir;
    this.lock = null;
    return inputToDir(this.surface, move);
  }

  private jump(): void {
    if (this.surface === 'air') return;
    const { normal, tangent } = SURFACES[this.surface];
    const along = this.dir === 0 ? 0 : this.dir * (this.running ? SPIDER.runSpeed : SPIDER.walkSpeed);
    this.body.vx = normal.x * SPIDER.jumpSpeed + tangent.x * along;
    this.body.vy = normal.y * SPIDER.jumpSpeed + tangent.y * along;
    // Pulo de parede ganha um pouco de altura.
    if (normal.x !== 0) this.body.vy -= SPIDER.jumpSpeed * 0.35;
    this.detach();
    this.stickCooldown = SPIDER.stickCooldown;
  }

  private detach(): void {
    this.surface = 'air';
    this.dir = 0;
    this.lock = null;
  }

  // ---------- no ar / na teia ----------

  private updateAir(dt: number, input: SpiderInput): void {
    const b = this.body;
    const rope = this.rope;

    if (rope) {
      b.vx += input.move.x * WEB.swingAccel * dt;
      rope.length = clamp(rope.length + input.move.y * WEB.reelSpeed * dt, WEB.minLength, WEB.range);
      if (input.jumpPressed) {
        this.rope = null;
        b.vy -= WEB.releaseBoost;
      }
    } else {
      const ax = input.move.x * AIR.accel;
      if (Math.abs(b.vx) < AIR.maxSpeedX || Math.sign(ax) !== Math.sign(b.vx)) b.vx += ax * dt;
    }
    b.vy = Math.min(b.vy + AIR.gravity * dt, AIR.terminalSpeed);

    const hit = moveAndCollide(this.grid, b, b.vx * dt, b.vy * dt);

    if (this.rope) {
      applyRopeConstraint(this.grid, b, this.rope);
      if (this.rope.length <= SPIDER.half + WEB.attachSlack) this.tryAttachAtAnchor();
    } else if (this.stickCooldown <= 0 && (hit.x !== 0 || hit.y !== 0)) {
      this.surface = hit.y !== 0 ? surfaceFacing({ x: 0, y: hit.y }) : surfaceFacing({ x: hit.x, y: 0 });
      b.vx = 0;
      b.vy = 0;
      this.dir = 0;
      this.lock = null;
    }

    if (Math.abs(b.vx) > 8) this.facing = Math.sign(b.vx);
  }

  private shootWeb(aim: Vec2): void {
    const from = { x: this.body.x, y: this.body.y };
    const hit = raycastWeb(this.grid, from, aim, WEB.range);
    if (!hit) {
      const d = Math.hypot(aim.x - from.x, aim.y - from.y) || 1;
      const to = {
        x: from.x + ((aim.x - from.x) / d) * WEB.range,
        y: from.y + ((aim.y - from.y) / d) * WEB.range,
      };
      this.shotFlash = { from, to, timeLeft: WEB.missFlashSec };
      return;
    }
    this.rope = {
      anchor: hit.point,
      length: clamp(hit.distance, WEB.minLength, WEB.range),
      anchorSurface: hit.surface,
    };
    if (this.surface !== 'air') {
      this.detach();
      this.body.vx = 0;
      this.body.vy = 0;
    }
  }

  /** Chegou na âncora: tenta grudar na superfície onde a teia está presa. */
  private tryAttachAtAnchor(): void {
    if (!this.rope) return;
    const { anchor, anchorSurface } = this.rope;
    const n = SURFACES[anchorSurface].normal;
    const t = this.grid.tileSize;
    const b = this.body;
    const prev = { x: b.x, y: b.y };

    const faceCoord = (a: number, dirN: number) => (dirN > 0 ? Math.floor(a / t) * t : (Math.floor(a / t) + 1) * t);
    if (n.y !== 0) {
      b.y = faceCoord(anchor.y, n.y) + n.y * b.half;
      b.x = anchor.x;
    } else {
      b.x = faceCoord(anchor.x, n.x) + n.x * b.half;
      b.y = anchor.y;
    }

    if (overlapsSolid(this.grid, b) || !hasSupport(this.grid, b, anchorSurface)) {
      b.x = prev.x;
      b.y = prev.y;
      return;
    }
    this.rope = null;
    this.surface = anchorSurface;
    b.vx = 0;
    b.vy = 0;
    this.dir = 0;
    this.lock = null;
  }
}

function inputKey(move: Vec2): string {
  return `${Math.sign(move.x)},${Math.sign(move.y)}`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
