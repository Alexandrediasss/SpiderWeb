// Arte de cada ato na seleção de atos (240×135, como a arte dos episódios da Telltale), com moldura gasta.
// Montada com as peças da cutscene da rua. Spec: docs/features/acts.md
import { SPIDER } from '../config';
import { boltPath } from '../systems/storm';
import { ditherLevel } from './lighting';
import { PixelCanvas, type RGB, hash } from './PixelCanvas';
import { PAL } from './palette';
import { SPIDER_FRAMES, buildSpiderSheet } from './spiderArt';
import { HOUSES_BASE, WIDE_SHOT, buildHouses, buildRoofEdge, buildStreetSky, buildWideStreet } from './streetArt';
import { mixColor, shadeColor } from './tilePainters';
import { drawLock } from './uiArt';
import { getNeighborArt } from './neighborArt';
import { CHANDELIER_ART, SICK_FRAME, SICK_POSES, buildChandelier, buildSickSheets } from './sickArt';

const WEB_COLOR = 0xe8e4f0;
import { ZOMBIE_FRAMES, ZOMBIE_LOOKS, buildZombieSheets } from './zombieArt';

export const ACT_ART = { w: 240, h: 135 } as const;

const S = PAL.street;
const A = PAL.acts;

export function buildActArt(actId: string): PixelCanvas {
  const pc = actId === 'act1' ? actOne() : actId === 'act2' ? actTwo() : actId === 'act3' ? actThree() : lockedAct();
  grungeFrame(pc, actId.length * 17);
  return pc;
}

/**
 * Ato 1: o plano aberto da cutscene da rua, mais baixo para mostrar o céu com um raio, e a aranha em
 * primeiro plano (2×) na calha, olhando a horda que enche a rua.
 */
function actOne(): PixelCanvas {
  const W = WIDE_SHOT;
  const oy = 40;
  const pc = new PixelCanvas(ACT_ART.w, ACT_ART.h);
  pc.blit(buildStreetSky(ACT_ART.w, ACT_ART.h), 0, 0);
  drawBolt(pc, 122, 44, 5);
  pc.blit(buildHouses(), 0, W.housesBase - HOUSES_BASE + oy);
  pc.blit(buildWideStreet(), 0, W.streetTop + oy);

  // A multidão: duas fileiras, com a luz da noite e um pouco do clarão.
  const sheets = buildZombieSheets(1);
  W.rows.forEach((rowY, row) => {
    const count = row === 0 ? 15 : 12;
    const tint = mixColor(S.crowdLight[row], 0xffffff, 0.3);
    for (let i = 0; i < count; i++) {
      const x = Math.round(((i + 0.2 + hash(i, row, 3) * 0.6) * ACT_ART.w) / count);
      const look = Math.floor(hash(i, row, 4) * ZOMBIE_LOOKS.length);
      const frame = Math.floor(hash(i, row, 5) * ZOMBIE_FRAMES);
      const sx = frame * sheets.frameW;
      const sy = look * sheets.frameH;
      const dx = x - sheets.frameW / 2;
      const dy = rowY + oy - sheets.frameH;
      blitRegion(pc, sheets.body, sx, sy, sheets.frameW, sheets.frameH, dx, dy, tint);
      blitRegion(pc, sheets.eyes, sx, sy, sheets.frameW, sheets.frameH, dx, dy, S.eyeLight);
    }
  });

  // Beira do telhado embaixo e a aranha grande (3×) em cima da calha, com a borda acesa pelo raio.
  const gutterY = ACT_ART.h - 10;
  pc.blit(buildRoofEdge(), 0, gutterY);
  const scale = 3;
  const big = new PixelCanvas(SPIDER.frameW * scale, SPIDER.frameH * scale);
  const idle = SPIDER_FRAMES.findIndex((f) => f.name === 'idle0');
  blitRegion(big, buildSpiderSheet(), idle * SPIDER.frameW, 0, SPIDER.frameW, SPIDER.frameH, 0, 0, mixColor(0x50587a, 0xffffff, 0.15), scale);
  rimLight(big, S.flash);
  pc.blit(big, 30, gutterY + scale - big.height);
  return pc;
}

/**
 * Ato 2: a aranha no meio do balanço, presa por um fio de teia no braço de um poste de luz, com a ventania
 * (riscos brancos e chuva deitada), um fio solto faiscando e a horda lá embaixo.
 */
function actTwo(): PixelCanvas {
  const pc = new PixelCanvas(ACT_ART.w, ACT_ART.h);
  const R = PAL.act2;
  pc.blit(buildStreetSky(ACT_ART.w, ACT_ART.h), 0, 0);
  drawBolt(pc, 196, 50, 9);

  // Casas do outro lado, bem escuras, e a horda passando embaixo.
  const houses = buildHouses();
  for (let y = 0; y < houses.height; y++) {
    for (let x = 0; x < houses.width; x++) {
      const i = (y * houses.width + x) * 4;
      if (houses.data[i + 3] === 0) continue;
      const c = (houses.data[i] << 16) | (houses.data[i + 1] << 8) | houses.data[i + 2];
      pc.set(x, y + ACT_ART.h - 6 - HOUSES_BASE, c === S.windowLit ? c : shadeColor(c, 0.45));
    }
  }
  const sheets = buildZombieSheets(1);
  for (let i = 0; i < 16; i++) {
    const look = Math.floor(hash(i, 1, 6) * ZOMBIE_LOOKS.length);
    const frame = Math.floor(hash(i, 2, 6) * ZOMBIE_FRAMES);
    const x = Math.round(((i + 0.3 + hash(i, 3, 6) * 0.5) * ACT_ART.w) / 16) - sheets.frameW / 2;
    blitRegion(pc, sheets.body, frame * sheets.frameW, look * sheets.frameH, sheets.frameW, sheets.frameH, x, ACT_ART.h - 2 - sheets.frameH, 0x4d5470);
    blitRegion(pc, sheets.eyes, frame * sheets.frameW, look * sheets.frameH, sheets.frameW, sheets.frameH, x, ACT_ART.h - 2 - sheets.frameH, S.eyeLight);
  }

  // Poste de luz à esquerda (braço para a direita, luz acesa) e poste de madeira à direita, com fio solto.
  pc.rect(30, 22, 4, ACT_ART.h, shadeColor(R.metal, 0.55));
  pc.rect(30, 22, 34, 3, shadeColor(R.metal, 0.6));
  pc.rect(58, 25, 8, 3, shadeColor(R.metalDark, 0.6));
  pc.disc(62, 30, 6, R.lamp, 0.25);
  pc.rect(59, 28, 6, 2, R.lampGlass);
  pc.rect(196, 34, 4, ACT_ART.h, shadeColor(R.wood, 0.5));
  pc.rect(184, 34, 28, 3, shadeColor(R.wood, 0.55));
  pc.line(186, 37, 182, 60, R.wire);
  pc.line(182, 60, 176, 70, R.wire);
  for (const [dx, dy] of [
    [0, 0],
    [-2, -1],
    [1, -2],
    [-1, 2],
    [2, 1],
  ]) {
    pc.set(176 + dx, 70 + dy, dx === 0 && dy === 0 ? R.sparkHot : R.spark);
  }
  pc.line(0, 30, 196, 36, R.wire);

  // A teia do braço do poste até a aranha, no meio do balanço (2×, com a borda acesa).
  const sx = 120;
  const sy = 74;
  pc.line(62, 26, sx, sy, WEB_COLOR);
  const scale = 2;
  const big = new PixelCanvas(SPIDER.frameW * scale, SPIDER.frameH * scale);
  const air = SPIDER_FRAMES.findIndex((f) => f.name === 'air');
  blitRegion(big, buildSpiderSheet(), air * SPIDER.frameW, 0, SPIDER.frameW, SPIDER.frameH, 0, 0, mixColor(0x6a7090, 0xffffff, 0.3), scale);
  rimLight(big, S.flash);
  pc.blit(big, sx - big.width / 2, sy - big.height / 2);

  // Ventania: chuva deitada e riscos brancos.
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(hash(i, 4, 6) * ACT_ART.w);
    const y = Math.floor(hash(i, 5, 6) * ACT_ART.h);
    pc.line(x, y, x + 3, y + 2, S.rain, 0.5);
  }
  for (let i = 0; i < 22; i++) {
    const len = 8 + Math.floor(hash(i, 6, 6) * 26);
    const x = Math.floor(hash(i, 7, 6) * ACT_ART.w);
    const y = Math.floor(hash(i, 8, 6) * (ACT_ART.h - 30));
    for (let k = 0; k < len; k++) pc.set(x + k, y, R.streak, 0.25 + (0.6 * k) / len);
  }
  return pc;
}

/**
 * Ato 3: a cozinha escura da casa vizinha no clarão de um raio. O doente embaixo do lustre, a gosma
 * jorrando do esgoto, o machado na parede, e a Mary pendurada num fio de teia, olhando a corda do lustre.
 */
function actThree(): PixelCanvas {
  const pc = new PixelCanvas(ACT_ART.w, ACT_ART.h);
  const art = getNeighborArt();
  const x0 = 130;
  const y0 = 672 + 4 - ACT_ART.h;
  // O cenário com a luz da casa sem energia e um pouco do clarão do raio entrando pela janela.
  for (let y = 0; y < ACT_ART.h; y++) {
    for (let x = 0; x < ACT_ART.w; x++) {
      const s = ((y0 + y) * art.canvas.width + x0 + x) * 4;
      const d = (y * ACT_ART.w + x) * 4;
      const flash = (art.flash.data[s + 3] / 255) * 0.4;
      for (let k = 0; k < 3; k++) {
        const lit = (art.canvas.data[s + k] * art.light.data[s + k]) / 255;
        pc.data[d + k] = Math.min(255, lit + (art.flash.data[s + k] - lit) * flash * 0.5 + 6);
      }
      pc.data[d + 3] = 255;
    }
  }
  const floor = 672 - y0;
  const G = PAL.intro;
  // A gosma jorrando do buraco do esgoto, com o brilho verde em volta.
  const jx = 18 * 16 + 8 - x0;
  for (let y = 0; y < ACT_ART.h; y++) {
    for (let x = 0; x < ACT_ART.w; x++) {
      const v = 1 - Math.hypot((x - jx) / 46, (y - floor + 30) / 52);
      if (v > 0) pc.set(x, y, G.gooGlow, ditherLevel(v, x, y, 4) * 0.28);
    }
  }
  for (let y = floor - 64; y < floor; y++) {
    const half = 2 + Math.round(Math.sin(y * 0.7) * 1.2);
    for (let x = jx - half; x <= jx + half; x++) pc.set(x, y, x === jx - half ? G.gooLight : x === jx + half ? G.gooDark : G.goo);
  }
  for (let i = 0; i < 12; i++) pc.set(jx - 8 + Math.floor(hash(i, 1, 9) * 16), floor - 64 - Math.floor(hash(i, 2, 9) * 14), G.gooLight);
  pc.rect(jx - 22, floor - 2, 44, 2, G.goo);
  pc.rect(jx - 22, floor - 2, 44, 1, G.gooLight);

  // O doente, embaixo do lustre, esticando o braço; a borda acesa pelo raio.
  const lustreX = 13 * 16 - x0;
  const sheets = buildSickSheets();
  const pose = SICK_POSES.indexOf('walk0');
  const sick = new PixelCanvas(SICK_FRAME.w, SICK_FRAME.h);
  blitRegion(sick, sheets.body, pose * SICK_FRAME.w, 0, SICK_FRAME.w, SICK_FRAME.h, 0, 0, 0x8088a8);
  blitRegion(sick, sheets.eyes, pose * SICK_FRAME.w, 0, SICK_FRAME.w, SICK_FRAME.h, 0, 0, 0xffffff);
  rimLight(sick, S.flash);
  pc.blit(sick, lustreX - SICK_FRAME.w / 2 + 4, floor - SICK_FRAME.h);

  // O lustre pendurado (a corda sobe até o teto, fora do quadro).
  const ly = 22;
  pc.line(lustreX, 0, lustreX, ly, PAL.act3.rope);
  const lustre = buildChandelier();
  const tinted = new PixelCanvas(CHANDELIER_ART.w, CHANDELIER_ART.h);
  blitRegion(tinted, lustre, 0, 0, CHANDELIER_ART.w, CHANDELIER_ART.h, 0, 0, 0xa0a4c0);
  rimLight(tinted, S.flash);
  pc.blit(tinted, lustreX - Math.floor(CHANDELIER_ART.w / 2), ly);

  // A Mary pendurada num fio de teia, ao lado da corda (2×).
  const mx = lustreX - 44;
  const my = 46;
  pc.line(mx, 0, mx, my - 6, WEB_COLOR);
  const scale = 2;
  const big = new PixelCanvas(SPIDER.frameW * scale, SPIDER.frameH * scale);
  const air = SPIDER_FRAMES.findIndex((f) => f.name === 'air');
  blitRegion(big, buildSpiderSheet(), air * SPIDER.frameW, 0, SPIDER.frameW, SPIDER.frameH, 0, 0, mixColor(0x6a7090, 0xffffff, 0.35), scale);
  rimLight(big, S.flash);
  pc.blit(big, mx - big.width / 2, my - big.height / 2);
  return pc;
}

/** Ato bloqueado: silhuetas dos telhados do bairro na tempestade (só umas janelas acesas) e um cadeado. */
function lockedAct(): PixelCanvas {
  const pc = new PixelCanvas(ACT_ART.w, ACT_ART.h);
  pc.blit(buildStreetSky(ACT_ART.w, ACT_ART.h), 0, 0);
  drawBolt(pc, 52, 60, 11);
  const houses = buildHouses();
  const top = ACT_ART.h - 14 - HOUSES_BASE;
  for (let y = 0; y < houses.height; y++) {
    for (let x = 0; x < houses.width; x++) {
      const i = (y * houses.width + x) * 4;
      if (houses.data[i + 3] === 0) continue;
      const [r, , b] = [houses.data[i], houses.data[i + 1], houses.data[i + 2]];
      // Janela acesa continua (menos as de trás do cadeado); o resto vira silhueta.
      const c = (r << 16) | (houses.data[i + 1] << 8) | b;
      const lit = (c === S.windowLit || c === S.windowLitDark) && Math.abs(x - ACT_ART.w / 2) > 24;
      pc.set(x, y + top, lit ? shadeColor(c, 0.8) : A.silhouette);
    }
  }
  pc.rect(0, ACT_ART.h - 14, ACT_ART.w, 14, A.silhouette);
  for (let y = 0; y < ACT_ART.h; y++) for (let x = 0; x < ACT_ART.w; x++) pc.shade(x, y, 0.55);
  drawLock(pc, ACT_ART.w / 2, 58);
  return pc;
}

/** Copia um pedaço de `src` multiplicando a cor por `tint` (como o tint do Phaser), ampliado `scale` vezes. */
function blitRegion(
  dst: PixelCanvas,
  src: PixelCanvas,
  sx: number,
  sy: number,
  w: number,
  h: number,
  dx: number,
  dy: number,
  tint: RGB,
  scale = 1,
): void {
  const tr = ((tint >> 16) & 255) / 255;
  const tg = ((tint >> 8) & 255) / 255;
  const tb = (tint & 255) / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = ((sy + y) * src.width + sx + x) * 4;
      const a = src.data[i + 3];
      if (a === 0) continue;
      const c = (Math.round(src.data[i] * tr) << 16) | (Math.round(src.data[i + 1] * tg) << 8) | Math.round(src.data[i + 2] * tb);
      const ox = Math.round(dx) + x * scale;
      const oy = Math.round(dy) + y * scale;
      for (let k = 0; k < scale * scale; k++) dst.set(ox + (k % scale), oy + Math.floor(k / scale), c, a / 255);
    }
  }
}

/** Contorno claro em cima e à direita (o lado do raio): destaca a silhueta no fundo escuro. */
function rimLight(pc: PixelCanvas, c: RGB): void {
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < pc.width && y < pc.height && pc.data[(y * pc.width + x) * 4 + 3] > 0;
  const rim: [number, number][] = [];
  for (let y = 0; y < pc.height; y++) {
    for (let x = 0; x < pc.width; x++) if (solid(x, y) && (!solid(x, y - 1) || !solid(x + 1, y))) rim.push([x, y]);
  }
  for (const [x, y] of rim) pc.set(x, y, c, 0.9);
}

/** Raio com um halo fraco em volta. */
function drawBolt(pc: PixelCanvas, x: number, length: number, seed: number): void {
  const lines = boltPath(seed, length);
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) {
      const [a, b] = [line[i - 1], line[i]];
      pc.line(x + a.x - 1, a.y, x + b.x - 1, b.y, S.flash, 0.25);
      pc.line(x + a.x + 1, a.y, x + b.x + 1, b.y, S.flash, 0.25);
    }
  }
  for (const line of lines) for (let i = 1; i < line.length; i++) pc.line(x + line[i - 1].x, line[i - 1].y, x + line[i].x, line[i].y, S.bolt);
}

/** Moldura gasta: borda escura serrilhada, um fio mais claro e vinheta pontilhada para dentro. */
function grungeFrame(pc: PixelCanvas, seed: number): void {
  const { width: w, height: h } = pc;
  const jag = (i: number, k: number) => 2 + Math.floor(hash(Math.floor(i / 2), k, seed) * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gaps = [x - jag(y, 1), w - 1 - x - jag(y, 2), y - jag(x, 3), h - 1 - y - jag(x, 4)];
      const g = Math.min(...gaps);
      if (g < 0) pc.set(x, y, A.frame);
      else if (g === 0) pc.set(x, y, A.frameRim);
      else {
        const v = Math.max(0, 1 - g / 28);
        pc.shade(x, y, 1 - 0.5 * ditherLevel(v, x, y, 4));
      }
    }
  }
}
