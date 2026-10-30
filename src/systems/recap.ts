// Resumo de um ato (cena do SCENES, liberada ao terminar o ato): um diretor que pilota a aranha de verdade
// pelo mapa, plano a plano, com entradas roteirizadas (andar, pular, teia, atirar, ler). Cada ação termina
// ao chegar no objetivo; o tempo máximo é só para nunca travar (os testes exigem que nenhuma estoure).
// Lógica pura. Spec: docs/features/scenes.md
import { RECAP, WIND } from '../config';
import type { AttachedSurface, Surface, Vec2 } from '../physics/surfaces';
import type { SpiderMotor } from './SpiderMotor';
import type { Combat, CombatEvent, ShotKind } from './combat';
import { type SpiderInput, emptyInput } from './input';

/** Objetivo de uma ação: o centro da aranha dentro de uma faixa (px do mundo) e/ou grudada. */
export interface Goal {
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
  /** true = grudada em qualquer superfície; ou numa específica. */
  attached?: boolean | AttachedSurface;
}

export type RecapAction =
  /** Parada (sem tocar em nada). */
  | { type: 'wait'; sec: number }
  /** Segura a direção até o objetivo (andando grudada ou no ar). */
  | { type: 'move'; move: Vec2; run?: boolean; until: Goal; maxSec: number }
  /** Pula (precisa estar grudada) e segura a direção até o objetivo. */
  | { type: 'jump'; move: Vec2; run?: boolean; until: Goal; maxSec: number }
  /**
   * Teia de balanço: atira em `anchor` (sem `anchor`, continua na teia que já tem) e segura, com `move`
   * (x balança, y recolhe/solta), até o objetivo. Na ação seguinte a teia solta, a não ser que ela também
   * seja uma teia sem `anchor`.
   */
  | { type: 'web'; anchor?: Vec2; move: Vec2; until: Goal; maxSec: number }
  /** Atira no rato até ele morrer (ataque) ou ficar preso (prender), um tiro a cada `everySec`. */
  | { type: 'shoot'; kind: ShotKind; rat: number; everySec: number; maxSec: number }
  /** Lê a carta (a cena mostra a página) e fica parada. */
  | { type: 'read'; letter: string; sec: number };

export interface RecapShot {
  /** Nome do plano (testes e debug). */
  name: string;
  /** Onde a aranha começa: tile vazio logo acima do chão. */
  start: { tx: number; ty: number; facing?: 1 | -1 };
  /** Legenda na faixa de baixo (o jogo é em inglês). */
  caption?: string;
  /** Zoom da câmera neste plano. */
  zoom: number;
  /** Para onde a câmera olha além da aranha (px; +y = mais embaixo, para mostrar a horda). */
  look?: Vec2;
  /**
   * Vento do plano (ato 2): força 0..1 e direção, constante. A aranha sente (como no jogo) e a cena mostra
   * a chuva, o som e os detritos da rajada.
   */
  wind?: { strength: number; dir: -1 | 1 };
  actions: RecapAction[];
  /** Segura o plano depois da última ação (s); o corte para o próximo acontece no fim. */
  holdSec: number;
}

/** O que o diretor precisa saber da aranha e dos ratos neste quadro. */
export interface RecapView {
  x: number;
  y: number;
  surface: Surface;
  hasRope: boolean;
  rats: { x: number; y: number; alive: boolean; trapped: boolean }[];
}

export type RecapEvent =
  /** Começou o plano `index`: a cena corta, põe a aranha no começo dele e mostra a legenda. */
  | { type: 'shot'; index: number }
  | { type: 'read'; letter: string; sec: number }
  | { type: 'end' };

export function goalReached(g: Goal, v: RecapView): boolean {
  if (g.minX !== undefined && v.x < g.minX) return false;
  if (g.maxX !== undefined && v.x > g.maxX) return false;
  if (g.minY !== undefined && v.y < g.minY) return false;
  if (g.maxY !== undefined && v.y > g.maxY) return false;
  if (g.attached === true && v.surface === 'air') return false;
  if (typeof g.attached === 'string' && v.surface !== g.attached) return false;
  return true;
}

/** Centro da aranha no começo do plano (em cima do chão do tile de baixo). */
export function shotStart(shot: RecapShot, tile: number, half: number): Vec2 {
  return { x: (shot.start.tx + 0.5) * tile, y: (shot.start.ty + 1) * tile - half };
}

/** O que o diretor vê: a aranha (SpiderMotor) e os ratos (Rat). */
export function recapView(
  m: { body: Vec2; surface: Surface; rope: unknown },
  rats: { body: Vec2; alive: boolean; state: string }[],
): RecapView {
  return {
    x: m.body.x,
    y: m.body.y,
    surface: m.surface,
    hasRope: m.rope !== null,
    rats: rats.map((r) => ({ x: r.body.x, y: r.body.y, alive: r.alive, trapped: r.state === 'trapped' })),
  };
}

/** Direção unitária de `from` até `to` (para as teias de combate). */
export function unitTo(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy) || 1;
  return { x: dx / d, y: dy / d };
}

export class RecapDirector {
  /** Plano atual (-1 antes do primeiro quadro). */
  shot = -1;
  /** Ação atual dentro do plano (igual ao número de ações = segurando o plano). */
  action = 0;
  done = false;
  /** Ações que terminaram pelo tempo máximo, sem chegar no objetivo ("plano#ação"). */
  readonly timeouts: string[] = [];
  private actionTime = 0;
  private fresh = true;
  private lastFire = 0;
  private holdTime = 0;

  constructor(readonly shots: RecapShot[]) {}

  /** Segundos que faltam para o corte, enquanto segura o fim do plano (senão null). */
  get holdLeft(): number | null {
    const s = this.shots[this.shot];
    if (!s || this.done || this.action < s.actions.length) return null;
    return Math.max(0, s.holdSec - this.holdTime);
  }

  step(dt: number, v: RecapView): { input: SpiderInput; events: RecapEvent[] } {
    const input = emptyInput();
    const events: RecapEvent[] = [];
    if (this.done) return { input, events };
    if (this.shot < 0) {
      this.startShot(0, events);
      return { input, events };
    }
    const shot = this.shots[this.shot];
    const act = shot.actions[this.action];
    if (!act) {
      this.holdTime += dt;
      if (this.holdTime < shot.holdSec) return { input, events };
      if (this.shot + 1 < this.shots.length) this.startShot(this.shot + 1, events);
      else {
        this.done = true;
        events.push({ type: 'end' });
      }
      return { input, events };
    }

    const fresh = this.fresh;
    this.fresh = false;
    this.actionTime += dt;
    let finished = false;
    switch (act.type) {
      case 'wait':
        finished = this.actionTime >= act.sec;
        break;
      case 'move':
        finished = goalReached(act.until, v);
        if (!finished) Object.assign(input, { move: act.move, run: !!act.run });
        break;
      case 'jump':
        if (fresh) input.jumpPressed = true;
        else finished = goalReached(act.until, v);
        if (!finished) Object.assign(input, { move: act.move, run: !!act.run });
        break;
      case 'web':
        if (act.anchor && fresh) input.webPressed = true;
        else finished = goalReached(act.until, v);
        if (!finished) Object.assign(input, { move: act.move, webHeld: true, aim: act.anchor ?? input.aim });
        break;
      case 'shoot': {
        const rat = v.rats[act.rat];
        finished = !rat || !rat.alive || (act.kind === 'trap' && rat.trapped);
        if (finished || !rat) break;
        input.aim = { x: rat.x, y: rat.y };
        if (fresh || this.actionTime - this.lastFire >= act.everySec) {
          this.lastFire = this.actionTime;
          if (act.kind === 'attack') input.attackPressed = true;
          else input.trapPressed = true;
        }
        break;
      }
      case 'read':
        if (fresh) events.push({ type: 'read', letter: act.letter, sec: act.sec });
        finished = this.actionTime >= act.sec;
        break;
    }
    // A teia continua presa entre uma ação de teia e a seguinte sem âncora nova.
    const next = shot.actions[this.action + 1];
    if (finished && act.type === 'web' && next?.type === 'web' && !next.anchor) Object.assign(input, { webHeld: true, aim: input.aim });
    if (!finished && 'maxSec' in act && this.actionTime >= act.maxSec) {
      finished = true;
      this.timeouts.push(`${shot.name}#${this.action}`);
    }
    if (finished) {
      this.action++;
      this.actionTime = 0;
      this.lastFire = 0;
      this.fresh = true;
    }
    return { input, events };
  }

  private startShot(index: number, events: RecapEvent[]): void {
    this.shot = index;
    this.action = 0;
    this.actionTime = 0;
    this.holdTime = 0;
    this.lastFire = 0;
    this.fresh = true;
    events.push({ type: 'shot', index });
  }
}

export interface RecapOut {
  events: RecapEvent[];
  combat: CombatEvent[];
  /** Teias de balanço atiradas (para o som). */
  webShots: number;
}

/** A aranha e os ratos que o resumo pilota. A cena passa os de verdade; os testes, só a lógica. */
export interface RecapActors {
  motor: SpiderMotor;
  /** Anda a aranha um passo (na cena, também atualiza o sprite). */
  stepSpider: (dt: number, input: SpiderInput) => void;
  combat: Combat | null;
}

/**
 * Roda o resumo em passos fixos (RECAP.stepSec), qualquer que seja a taxa de quadros: o resultado é sempre
 * o mesmo, igual ao dos testes. Em cada passo: diretor → aranha → teias e ratos (aranha invencível).
 */
export class RecapRun {
  readonly director: RecapDirector;
  private acc = 0;

  constructor(
    shots: RecapShot[],
    private readonly a: RecapActors,
    private readonly tile: number,
  ) {
    this.director = new RecapDirector(shots);
  }

  /** Avança `dt` segundos de verdade. Devolve o que aconteceu nesses passos (eventos do diretor e do combate). */
  advance(dt: number): RecapOut {
    const out: RecapOut = { events: [], combat: [], webShots: 0 };
    this.acc = Math.min(this.acc + dt, RECAP.stepSec * RECAP.maxStepsPerFrame);
    while (this.acc >= RECAP.stepSec && !this.director.done) {
      this.acc -= RECAP.stepSec;
      this.step(RECAP.stepSec, out);
    }
    return out;
  }

  private step(dt: number, out: RecapOut): void {
    const { motor, combat } = this.a;
    const { input, events } = this.director.step(dt, recapView(motor, combat?.rats ?? []));
    for (const e of events) {
      if (e.type !== 'shot') continue;
      const shot = this.director.shots[e.index];
      const p = shotStart(shot, this.tile, motor.body.half);
      motor.placeAt(p.x, p.y);
      motor.facing = shot.start.facing ?? 1;
    }
    out.events.push(...events);
    if (input.webPressed) out.webShots++;
    const wind = this.director.shots[this.director.shot]?.wind;
    motor.wind = wind ? wind.dir * wind.strength * WIND.gustAccel : 0;
    this.a.stepSpider(dt, input);
    motor.wind = 0;
    if (!combat) return;
    // Invencível: os ratos dão o bote, mas a mordida não tira vida nem empurra.
    combat.health.invulnLeft = Number.POSITIVE_INFINITY;
    if (input.attackPressed) out.combat.push(...combat.fire('attack', motor.body, unitTo(motor.body, input.aim)));
    if (input.trapPressed) out.combat.push(...combat.fire('trap', motor.body, unitTo(motor.body, input.aim)));
    out.combat.push(...combat.update(dt, motor));
  }
}
