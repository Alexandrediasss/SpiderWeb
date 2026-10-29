// Zumbis da cutscene da rua: corpo em blocos e braços esticados (como o zumbi do Minecraft), roupa do
// dia a dia rasgada, olhos grandes e desiguais e boca aberta (como o de Plants vs. Zombies).
// Vista 3/4 andando para a direita. Tudo em "blocos" de `u` px: o mesmo desenho sai em vários tamanhos.
// Os olhos também vão para uma folha separada (como os do rato): no escuro eles escurecem menos.
// Spec: docs/features/street-cutscene.md
import { ZOMBIE_FRAME_U } from '../systems/horde';
import { PixelCanvas, type RGB, hash } from './PixelCanvas';
import { PAL } from './palette';
import { mixColor, shadeColor } from './tilePainters';

const Z = PAL.zombie;

/** Quadros da caminhada. */
export const ZOMBIE_FRAMES = 6;
/** Tamanhos do bloco (px) gerados no boot: perto, meio, longe e a multidão do plano aberto. */
export const ZOMBIE_SIZES = [6, 4, 2, 1] as const;

type Outfit = 'suit' | 'tee' | 'robe' | 'overalls' | 'hoodie' | 'cardigan';
type Hair = 'tuft' | 'short' | 'curlers' | 'bald' | 'messy' | 'thin';

export interface ZombieLook {
  name: string;
  outfit: Outfit;
  hair: Hair;
  /** Manca: a perna de trás balança menos. */
  limp?: boolean;
  /** Perdeu o braço da frente (sobra o toco da manga). */
  missingArm?: boolean;
  glasses?: boolean;
  /** Furo no joelho da calça. */
  rippedKnee?: boolean;
  /** Para onde olham as pupilas (em blocos): olho de trás (x, y) e da frente (x, y). Desencontradas de propósito. */
  gaze: [number, number, number, number];
}

export const ZOMBIE_LOOKS: ZombieLook[] = [
  { name: 'suit', outfit: 'suit', hair: 'tuft', gaze: [0.5, 0.2, -0.3, -0.3] },
  { name: 'tee', outfit: 'tee', hair: 'short', rippedKnee: true, gaze: [0.4, -0.4, 0.4, -0.4] },
  { name: 'robe', outfit: 'robe', hair: 'curlers', gaze: [0.6, 0, 0.1, 0.3] },
  { name: 'overalls', outfit: 'overalls', hair: 'bald', limp: true, gaze: [-0.2, 0.3, 0.5, -0.2] },
  { name: 'hoodie', outfit: 'hoodie', hair: 'messy', missingArm: true, gaze: [0.5, -0.3, 0.5, 0.3] },
  { name: 'cardigan', outfit: 'cardigan', hair: 'thin', glasses: true, rippedKnee: true, gaze: [0.3, 0.3, 0.3, 0.3] },
];

/** Nome do quadro na folha: visual-quadro. */
export function zombieFrameName(look: number, frame: number): string {
  return `${look}-${frame}`;
}

/** Folha de quadros (linhas = visuais, colunas = quadros da caminhada) e a folha só com os olhos. */
export function buildZombieSheets(u: number): { body: PixelCanvas; eyes: PixelCanvas; frameW: number; frameH: number } {
  const frameW = ZOMBIE_FRAME_U.w * u;
  const frameH = ZOMBIE_FRAME_U.h * u;
  const body = new PixelCanvas(frameW * ZOMBIE_FRAMES, frameH * ZOMBIE_LOOKS.length);
  const eyes = new PixelCanvas(body.width, body.height);
  ZOMBIE_LOOKS.forEach((look, li) => {
    for (let f = 0; f < ZOMBIE_FRAMES; f++) drawZombie(body, eyes, f * frameW, li * frameH, u, look, f);
  });
  return { body, eyes, frameW, frameH };
}

type Fill = RGB | ((lx: number, ly: number, w: number, h: number) => RGB | null);

function drawZombie(body: PixelCanvas, eyes: PixelCanvas, ox: number, oy: number, u: number, look: ZombieLook, frame: number): void {
  const C = Z.looks[look.outfit];
  const W = ZOMBIE_FRAME_U.w * u;
  const H = ZOMBIE_FRAME_U.h * u;
  const OL = Z.outline;
  const thick = u >= 3;

  // Blocos → pixels. y em blocos cresce para cima a partir do chão.
  const X = (v: number) => ox + Math.round(v * u);
  const Y = (v: number) => oy + H - Math.round(v * u);
  const inFrame = (px: number, py: number) => px >= ox && px < ox + W && py >= oy && py < oy + H;
  const put = (px: number, py: number, c: RGB, target = body) => {
    if (inFrame(px, py)) target.set(px, py, c);
  };
  /** Retângulo em blocos, de (x0, y0) a (x1, y1); sempre pelo menos 1 px. `outline` desenha uma borda escura em volta. */
  const box = (x0: number, y0: number, x1: number, y1: number, fill: Fill, outline = false, target = body) => {
    const left = X(x0);
    const right = Math.max(left + 1, X(x1));
    const top = Y(y1);
    const bottom = Math.max(top + 1, Y(y0));
    if (outline && thick) {
      for (let py = top - 1; py <= bottom; py++) for (let px = left - 1; px <= right; px++) put(px, py, OL);
    }
    for (let py = top; py < bottom; py++) {
      for (let px = left; px < right; px++) {
        const c = typeof fill === 'number' ? fill : fill(px - left, py - top, right - left, bottom - top);
        if (c !== null) put(px, py, c, target);
      }
    }
  };
  const sh = shadeColor;

  // ---------- pose do quadro ----------
  const a = (frame / ZOMBIE_FRAMES) * Math.PI * 2;
  const s = Math.sin(a);
  const c = Math.cos(a);
  const swing = 2.2 * s;
  const farSwing = -2.2 * s * (look.limp ? 0.45 : 1);
  const nearLift = Math.max(0, c) * 0.8;
  const farLift = Math.max(0, -c) * (look.limp ? 0.3 : 0.8);
  // Corpo mais alto quando as pernas se cruzam; quem manca afunda quando pisa com a perna ruim.
  const bob = (1 - Math.abs(s)) * 0.5 - (look.limp && s < 0 ? 0.4 : 0);
  const nod = Math.sin(a * 2) * 0.25;
  const nearArmBob = Math.sin(a + 0.8) * 0.35;
  const farArmBob = Math.sin(a + 2.4) * 0.35;
  /** Corcunda: o tronco vai para a frente conforme sobe. */
  const hunch = (v: number) => (v > 21 + bob ? 1.2 : v > 18 + bob ? 0.6 : 0);

  const skin = C.skin;
  const skinShade = sh(skin, 0.8);
  const skinDark = sh(skin, 0.6);
  const legColor = look.outfit === 'robe' ? skin : C.legs;
  const sleeve = C.top;
  const sleeveEnd = look.outfit === 'tee' ? 13.9 : look.outfit === 'overalls' ? 15.6 : look.outfit === 'robe' ? 17 : 17.6;

  // ---------- braço de trás ----------
  const arm = (dx: number, dy: number, armBob: number, dim: number, outlined: boolean) => {
    const top = 23 + bob + armBob + dy;
    const bottom = top - 2.6;
    const tone = (col: RGB) => (dim < 1 ? sh(col, dim) : col);
    const sleeveFill: Fill = (_lx, ly, _w, hh) => tone(ly === 0 ? sh(sleeve, 1.12) : ly >= hh - Math.max(1, Math.round(u / 3)) ? sh(sleeve, 0.78) : sleeve);
    const skinFill: Fill = (_lx, ly, _w, hh) => tone(ly === 0 ? sh(skin, 1.1) : ly >= hh - Math.max(1, Math.round(u / 3)) ? skinShade : skin);
    if (outlined && thick) {
      box(10 + dx, bottom, 20.6 + dx, top, OL, true);
      box(20.6 + dx, bottom - 0.4, 22.2 + dx, top - 0.4, OL, true);
    }
    box(10 + dx, bottom, sleeveEnd + dx, top, sleeveFill);
    box(sleeveEnd + dx, bottom, 20.6 + dx, top, skinFill);
    // Punho rasgado.
    for (let k = 0; k < 3; k++) box(sleeveEnd + dx, bottom + k * 0.9, sleeveEnd + dx + (k % 2 ? 0.5 : 0.2), bottom + k * 0.9 + 0.6, tone(sh(sleeve, 0.85)));
    // Mão caída, com dois dedos pendurados.
    box(20.6 + dx, bottom - 0.4, 22.2 + dx, top - 0.4, skinFill);
    box(21.3 + dx, bottom - 1.1, 21.8 + dx, bottom - 0.4, tone(skinShade));
    box(21.9 + dx, bottom - 0.9, 22.3 + dx, bottom - 0.4, tone(skinShade));
  };
  arm(0.5, 1.2, farArmBob, 0.7, false);

  // ---------- pernas ----------
  const leg = (cx: number, swingU: number, lift: number, dim: number, near: boolean) => {
    const tone = (col: RGB) => (dim < 1 ? sh(col, dim) : col);
    const top = Y(13 + bob);
    const bottom = Y(2 + lift);
    const back = Math.max(1, Math.round(u * 0.5));
    for (let py = top; py < bottom; py++) {
      const t = (py - top) / Math.max(1, bottom - top);
      const off = swingU * t;
      const left = X(cx - 1.5 + off);
      const right = Math.max(left + 1, X(cx + 1.5 + off));
      if (near && thick) {
        put(left - 1, py, OL);
        put(right, py, OL);
      }
      for (let px = left; px < right; px++) {
        let col = px - left < back ? sh(legColor, 0.8) : legColor;
        // Joelho rasgado (pele aparecendo) e a barra da calça desfiada.
        if (near && look.rippedKnee && t > 0.4 && t < 0.52 && px - left >= back && px < right - 1) col = skinShade;
        if (look.outfit !== 'robe' && t > 0.92 && hash(px, py, 13) < 0.35) col = sh(legColor, 0.7);
        put(px, py, tone(col));
      }
    }
    // Sapato: bico para a frente, sola escura.
    const fx = cx + swingU;
    const shoe: Fill = (lx, ly, w, hh) => {
      if (ly === 0 && lx >= w - Math.max(1, Math.round(u / 2))) return null;
      if (ly === hh - 1) return tone(sh(C.shoe, 0.6));
      return tone(ly === 0 ? sh(C.shoe, 1.15) : C.shoe);
    };
    box(fx - 1.6, lift, fx + 2.6, lift + 2, shoe, near);
  };
  leg(9, farSwing, farLift, 0.72, false);
  leg(10, swing, nearLift, 1, true);

  // ---------- tronco e roupa ----------
  const torsoTop = 24 + bob;
  const torsoBottom = (look.outfit === 'robe' ? 6.5 : look.outfit === 'suit' ? 11.6 : 12.4) + bob;
  for (let py = Y(torsoTop); py < Y(torsoBottom); py++) {
    const v = (oy + H - py) / u;
    const dx = hunch(v);
    const flare = look.outfit === 'robe' && v < 12 + bob ? (12 + bob - v) * 0.15 : 0;
    const left = X(6.6 + dx - flare);
    const right = X(13.4 + dx + flare);
    const hem = v < torsoBottom + 0.6;
    for (let px = left; px < right; px++) {
      // Barra rasgada: faltam pedaços embaixo.
      if (hem && hash(px, Math.floor(py / Math.max(1, u)), look.name.length) < 0.3) continue;
      const rx = (px - ox) / u - dx;
      let col = clothes(look, C, rx, v - bob, px, py, u);
      if (rx < 8.6) col = sh(col, 0.8);
      if (py === Y(torsoTop)) col = sh(col, 1.1);
      // Manchas escuras na roupa.
      if (hash(Math.floor(px / Math.max(1, u)), Math.floor(py / Math.max(1, u)), 7 + look.name.length) < 0.05) col = mixColor(col, Z.stain, 0.55);
      put(px, py, col);
    }
  }
  if (look.outfit === 'hoodie') box(6.4 + 1.2, 23 + bob, 9.6 + 1.2, 26 + bob, (lx, ly) => (ly === 0 && lx === 0 ? null : sh(C.top, 0.72)));

  // ---------- cabeça ----------
  const hx = 10.7;
  const hy = 25 + bob + nod;
  box(11.6, 23.6 + bob, 13.4, hy + 0.4, skinShade);
  // Bloco da cabeça: lado escuro, frente clara, topo mais claro, queixo sombreado; pele com manchas.
  box(hx, hy, hx + 8, hy + 8, (lx, ly, w, hh) => {
    let col = lx < 2 * u ? skinShade : skin;
    if (ly < Math.max(1, Math.round(u / 3))) col = sh(col, 1.08);
    if (ly >= hh - Math.max(1, Math.round(u / 3))) col = sh(col, 0.78);
    if (hash(Math.floor((lx + ox) / Math.max(1, u / 2)), Math.floor((ly + oy) / Math.max(1, u / 2)), 21) < 0.08) col = sh(col, 0.85);
    // Cantos de cima arredondados (só em tamanhos grandes).
    if (thick && ly === 0 && (lx === 0 || lx === w - 1)) return null;
    return col;
  }, true);
  // Orelha no lado.
  box(hx + 0.6, hy + 3.4, hx + 1.6, hy + 5.2, skinDark);
  // Nariz saindo da frente do rosto.
  box(hx + 7.6, hy + 3.4, hx + 8.5, hy + 4.4, skinShade, true);
  // Boca aberta com dois dentes e o queixo caído.
  box(hx + 3.4, hy + 1.1, hx + 7.6, hy + 2.6, Z.mouth);
  box(hx + 4.2, hy + 1.9, hx + 4.9, hy + 2.6, Z.tooth);
  box(hx + 6.2, hy + 2.0, hx + 6.8, hy + 2.6, Z.tooth);
  box(hx + 3.4, hy + 0.4, hx + 7.6, hy + 1.1, skinShade);
  // Sobrancelhas tortas.
  box(hx + 2.4, hy + 6.6, hx + 4.8, hy + 7.0, skinDark);
  box(hx + 5.6, hy + 6.2, hx + 7.6, hy + 6.6, skinDark);
  // Olhos grandes e desiguais (o de trás maior), com olheiras.
  const [gax, gay, gbx, gby] = look.gaze;
  const eye = (cx: number, cy: number, w: number, hh: number, gx: number, gy: number) => {
    box(cx - w / 2, cy - hh / 2 - 0.5, cx + w / 2, cy - hh / 2, skinDark);
    for (const target of [body, eyes]) {
      box(cx - w / 2, cy - hh / 2, cx + w / 2, cy + hh / 2, (lx, ly, ww, eh) => (thick && (lx === 0 || lx === ww - 1) && (ly === 0 || ly === eh - 1) ? null : Z.eye), false, target);
      box(cx - 0.35 + gx, cy - 0.35 + gy, cx + 0.35 + gx, cy + 0.35 + gy, Z.pupil, false, target);
    }
  };
  eye(hx + 3.7, hy + 5.0, 2.1, 2.3, gax, gay);
  eye(hx + 6.6, hy + 4.9, 1.6, 1.8, gbx, gby);
  if (look.glasses) {
    // Óculos com uma lente trincada.
    const frameCol = C.accent;
    box(hx + 2.4, hy + 6.2, hx + 7.8, hy + 6.5, frameCol);
    box(hx + 2.4, hy + 3.6, hx + 2.7, hy + 6.5, frameCol);
    box(hx + 5.0, hy + 3.6, hx + 5.6, hy + 6.5, frameCol);
    box(hx + 2.4, hy + 3.6, hx + 7.8, hy + 3.9, frameCol);
    box(hx + 1.6, hy + 5.6, hx + 2.4, hy + 5.9, frameCol);
    box(hx + 3.2, hy + 5.2, hx + 3.5, hy + 6.1, Z.eye);
  }
  hair(look, C.hair, C.accent, hx, hy, box, u);

  // ---------- braço da frente ----------
  if (look.missingArm) {
    // Só o toco da manga, caído.
    box(10.2, 19.4 + bob, 12.8, 23 + bob, (_lx, ly, _w, hh) => (ly >= hh - 1 ? sh(sleeve, 0.7) : sleeve), true);
    box(11, 18.8 + bob, 12, 19.4 + bob, skinDark);
  } else {
    arm(0, 0, nearArmBob, 1, true);
  }

  outlineFrame(body, ox, oy, W, H, OL);
}

/** Cor da roupa do tronco num ponto (rx, v em blocos, sem a corcunda). */
function clothes(look: ZombieLook, C: (typeof Z.looks)[keyof typeof Z.looks], rx: number, v: number, px: number, py: number, u: number): RGB {
  const sh = shadeColor;
  const inX = (a: number, b: number) => rx >= a && rx < b;
  const inV = (a: number, b: number) => v >= a && v < b;
  switch (look.outfit) {
    case 'suit':
      if (inX(10.9, 11.4) && inV(16, 23.4)) return C.accent;
      if (inX(10.6, 11.7) && inV(22.6, 23.6)) return sh(C.accent, 0.8);
      if (inX(10.3, 11.9) && inV(15.2, 24.1)) return C.topAlt;
      if ((inX(9.7, 10.3) || inX(11.9, 12.5)) && inV(18.6, 24)) return sh(C.top, 0.72);
      if (inX(12.6, 13.1) && inV(15, 15.6)) return sh(C.top, 0.55);
      return C.top;
    case 'tee':
      if (v < 13.2) return sh(C.legs, 0.85);
      if (inX(10.6, 12.6) && inV(18.8, 21)) return mixColor(C.top, C.accent, 0.45);
      if (inX(11.6, 12.4) && inV(15.6, 16.6)) return C.skin;
      return C.top;
    case 'robe':
      if (inX(10.8, 12.2) && inV(20.6, 24.1)) return C.skin;
      if ((inX(10, 10.8) || inX(12.2, 13)) && inV(17, 24.1)) return C.topAlt;
      if (inV(15.2, 16)) return sh(C.top, 0.7);
      if ((inX(11.4, 11.9) || inX(12.1, 12.6)) && inV(13.2, 15.2)) return sh(C.top, 0.7);
      return C.top;
    case 'overalls': {
      if ((inX(9.6, 10.2) || inX(12.1, 12.7)) && inV(19.6, 24.1)) return C.topAlt;
      if ((inX(9.6, 10.2) || inX(12.1, 12.7)) && inV(19.2, 19.8)) return Z.buckle;
      if (inX(9.4, 12.9) && v < 19.6) {
        if (inX(10.4, 11.9) && inV(16.6, 17.9) && (rx < 10.6 || v < 16.9)) return sh(C.topAlt, 0.7);
        return v > 19 ? sh(C.topAlt, 1.15) : C.topAlt;
      }
      if (v < 13.2) return C.topAlt;
      // Camisa xadrez (só aparece nos tamanhos grandes).
      const cell = Math.max(2, Math.round(u * 1.3));
      if (u >= 3 && (Math.floor((px - 1) / cell) % 3 === 0 || Math.floor(py / cell) % 3 === 0)) return sh(C.top, 0.62);
      return C.top;
    }
    case 'hoodie':
      if ((inX(10.6, 10.9) || inX(12, 12.3)) && inV(20.6, 24)) return C.accent;
      if (inX(9.6, 13) && inV(14, 16.6)) return v > 16.2 ? sh(C.topAlt, 0.7) : C.topAlt;
      if (v < 13.2) return sh(C.top, 0.8);
      return C.top;
    case 'cardigan':
      if (inX(10.1, 12.6) && inV(23.2, 24.1)) return sh(C.topAlt, 1.05);
      if (inX(10.4, 12.2) && inV(15.6, 24.1)) return C.topAlt;
      if (inX(12.25, 12.75) && [21, 19, 17, 15].some((b) => inV(b, b + 0.5))) return C.accent;
      if (v < 13.2) return sh(C.top, 0.8);
      return C.top;
  }
}

type BoxFn = (x0: number, y0: number, x1: number, y1: number, fill: Fill, outline?: boolean) => void;

function hair(look: ZombieLook, color: RGB, accent: RGB, hx: number, hy: number, box: BoxFn, u: number): void {
  const dark = shadeColor(color, 0.75);
  switch (look.hair) {
    case 'tuft':
      // Topete espetado e ralo no alto da cabeça.
      box(hx + 1.4, hy + 7.4, hx + 6.4, hy + 8.4, color);
      box(hx + 2.4, hy + 8.4, hx + 3.0, hy + 9.4, color);
      box(hx + 3.8, hy + 8.4, hx + 4.4, hy + 9.8, color);
      box(hx + 5.2, hy + 8.4, hx + 5.8, hy + 9.0, dark);
      break;
    case 'short':
      box(hx, hy + 7, hx + 8, hy + 8.5, color);
      box(hx, hy + 4.5, hx + 1.6, hy + 8.5, dark);
      break;
    case 'curlers':
      box(hx, hy + 6.6, hx + 8, hy + 8.4, color);
      box(hx, hy + 4, hx + 1.4, hy + 8.4, dark);
      for (const cx of [1.2, 3.6, 6.0]) box(hx + cx, hy + 8.2, hx + cx + 1.4, hy + 9.4, accent);
      break;
    case 'bald':
      // Careca com uns fios e uma mancha.
      box(hx + 2.2, hy + 7.6, hx + 3.6, hy + 8, shadeColor(color, 0.9));
      if (u >= 3) box(hx + 4, hy + 8, hx + 4.3, hy + 8.9, color);
      break;
    case 'messy':
      box(hx - 0.2, hy + 6.8, hx + 8.2, hy + 8.6, color);
      box(hx - 0.2, hy + 3, hx + 1.4, hy + 8.6, dark);
      box(hx + 6.6, hy + 6.2, hx + 7.4, hy + 6.8, color);
      box(hx + 2.6, hy + 8.6, hx + 3.4, hy + 9.2, color);
      break;
    case 'thin':
      // Cabelo branco só dos lados (topo careca).
      box(hx, hy + 5, hx + 1.4, hy + 7.4, color);
      box(hx + 1.4, hy + 6.8, hx + 2.6, hy + 7.6, color);
      break;
  }
}

/** Contorno escuro em volta da silhueta, sem sair do quadro. */
function outlineFrame(pc: PixelCanvas, ox: number, oy: number, w: number, h: number, color: RGB): void {
  const alpha = (x: number, y: number) => (x < ox || y < oy || x >= ox + w || y >= oy + h ? 0 : pc.data[(y * pc.width + x) * 4 + 3]);
  const add: [number, number][] = [];
  for (let y = oy; y < oy + h; y++) {
    for (let x = ox; x < ox + w; x++) {
      if (alpha(x, y) > 0) continue;
      if (alpha(x + 1, y) || alpha(x - 1, y) || alpha(x, y + 1) || alpha(x, y - 1)) add.push([x, y]);
    }
  }
  for (const [x, y] of add) pc.set(x, y, color);
}
