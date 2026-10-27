// Combate: vida da aranha, teias de ataque/prender e os ratos. Lógica pura: a cena só desenha e toca os sons.
// Spec: docs/features/combat.md
import { PLAYER, SHOTS } from '../config';
import type { RatSpawn } from '../level/houseMap';
import type { LevelGrid } from '../physics/LevelGrid';
import type { Body } from '../physics/collide';
import type { Vec2 } from '../physics/surfaces';
import type { SpiderMotor } from './SpiderMotor';
import { Rat } from './rat';

export type ShotKind = 'attack' | 'trap';

export interface WebShot {
  kind: ShotKind;
  x: number;
  y: number;
  /** Direção unitária. */
  dx: number;
  dy: number;
  traveled: number;
}

export type CombatEvent =
  | { type: 'fire'; kind: ShotKind }
  | { type: 'splat'; kind: ShotKind; x: number; y: number }
  | { type: 'ratSpotted'; rat: Rat }
  | { type: 'ratHurt'; rat: Rat }
  | { type: 'ratDied'; rat: Rat }
  | { type: 'ratTrapped'; rat: Rat }
  | { type: 'spiderHurt' }
  | { type: 'spiderDied' };

/** Vida da aranha com invencibilidade curta depois de cada dano. */
export class Health {
  hp: number;
  invulnLeft = 0;

  constructor(readonly max: number) {
    this.hp = max;
  }

  get dead(): boolean {
    return this.hp <= 0;
  }

  /** Tira 1 de vida, se não estiver invencível. Devolve se o dano valeu. */
  hit(): boolean {
    if (this.dead || this.invulnLeft > 0) return false;
    this.hp--;
    this.invulnLeft = PLAYER.invulnSec;
    return true;
  }

  update(dt: number): void {
    this.invulnLeft = Math.max(0, this.invulnLeft - dt);
  }
}

/** O ponto (x, y) está dentro da caixa (com uma folga)? */
function inside(b: Body, x: number, y: number, slack: number): boolean {
  return Math.abs(x - b.x) <= b.half + slack && Math.abs(y - b.y) <= b.half + slack;
}

/**
 * Mira assistida para as teias de combate: se algum alvo vivo está a até `maxDeg` da mira, dentro do
 * alcance e sem parede no caminho, aponta direto para o mais alinhado. Senão, devolve `dir`.
 */
export function aimAtTarget(grid: LevelGrid, from: Vec2, dir: Vec2, targets: Body[], range: number, maxDeg: number): Vec2 {
  const base = Math.atan2(dir.y, dir.x);
  let best: Vec2 | null = null;
  let bestDiff = (maxDeg * Math.PI) / 180;
  for (const t of targets) {
    const dx = t.x - from.x;
    const dy = t.y - from.y;
    const d = Math.hypot(dx, dy);
    if (d === 0 || d > range) continue;
    const diff = Math.abs(((Math.atan2(dy, dx) - base + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    if (diff > bestDiff) continue;
    if (grid.firstSolidDistance(from.x, from.y, t.x, t.y) < d - t.half) continue;
    best = { x: dx / d, y: dy / d };
    bestDiff = diff;
  }
  return best ?? dir;
}

export class Combat {
  readonly health = new Health(PLAYER.maxHp);
  readonly rats: Rat[];
  shots: WebShot[] = [];
  private readonly cooldown: Record<ShotKind, number> = { attack: 0, trap: 0 };

  constructor(
    private readonly grid: LevelGrid,
    spawns: RatSpawn[],
    seed: number,
  ) {
    this.rats = spawns.map((s, i) => new Rat(s, grid.tileSize, seed + i * 7919));
  }

  /** Corpos dos ratos vivos (para a mira assistida). */
  get ratTargets(): Body[] {
    return this.rats.filter((r) => r.alive).map((r) => r.body);
  }

  /** Atira uma teia de combate de `from` na direção `dir` (unitária), se não estiver em recarga. */
  fire(kind: ShotKind, from: Vec2, dir: Vec2): CombatEvent[] {
    if (this.health.dead || this.cooldown[kind] > 0) return [];
    this.cooldown[kind] = SHOTS[kind].cooldownSec;
    this.shots.push({ kind, x: from.x, y: from.y, dx: dir.x, dy: dir.y, traveled: 0 });
    return [{ type: 'fire', kind }];
  }

  update(dt: number, spider: SpiderMotor): CombatEvent[] {
    const events: CombatEvent[] = [];
    this.health.update(dt);
    this.cooldown.attack = Math.max(0, this.cooldown.attack - dt);
    this.cooldown.trap = Math.max(0, this.cooldown.trap - dt);

    this.updateShots(dt, events);

    const target = this.health.dead ? null : { x: spider.body.x, y: spider.body.y };
    for (const rat of this.rats) {
      for (const e of rat.update(dt, this.grid, target)) {
        if (e.type === 'spotted') events.push({ type: 'ratSpotted', rat });
        if (e.type === 'bite' && this.health.hit()) {
          const away = Math.sign(spider.body.x - rat.body.x) || 1;
          spider.knockback(away * PLAYER.knockbackX, -PLAYER.knockbackY);
          events.push({ type: 'spiderHurt' });
          if (this.health.dead) events.push({ type: 'spiderDied' });
        }
      }
    }
    return events;
  }

  /** Move as teias em passos de 2 px: param na parede (respingo) ou no primeiro rato vivo que tocarem. */
  private updateShots(dt: number, events: CombatEvent[]): void {
    const STEP = 2;
    this.shots = this.shots.filter((s) => {
      const cfg = SHOTS[s.kind];
      let left = cfg.speed * dt;
      while (left > 0) {
        const step = Math.min(STEP, left);
        left -= step;
        s.x += s.dx * step;
        s.y += s.dy * step;
        s.traveled += step;
        if (this.grid.isSolidPixel(s.x, s.y)) {
          events.push({ type: 'splat', kind: s.kind, x: s.x - s.dx * STEP, y: s.y - s.dy * STEP });
          return false;
        }
        const rat = this.rats.find((r) => r.alive && inside(r.body, s.x, s.y, 2));
        if (rat) {
          this.hitRat(rat, s, events);
          return false;
        }
        if (s.traveled >= cfg.range) return false;
      }
      return true;
    });
  }

  private hitRat(rat: Rat, shot: WebShot, events: CombatEvent[]): void {
    events.push({ type: 'splat', kind: shot.kind, x: shot.x, y: shot.y });
    if (shot.kind === 'trap') {
      if (rat.trap()) events.push({ type: 'ratTrapped', rat });
      return;
    }
    const result = rat.damage(SHOTS.damage, shot.x - shot.dx * 10);
    if (result === 'hurt') events.push({ type: 'ratHurt', rat });
    if (result === 'died') events.push({ type: 'ratDied', rat });
  }
}
