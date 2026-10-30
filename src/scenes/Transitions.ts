// Transições de tela em HTML por cima do jogo: o escurecer (#fade), a teia que puxa as telas do menu
// (#web-pull) e a transição de cada ato (#transition).
// Spec: docs/features/transitions.md
import { TRANSITION } from '../config';
import { PixelCanvas } from '../art/PixelCanvas';
import { drawGoo, drawWeb } from '../art/transitionArt';
import { buildWebSplat } from '../art/uiArt';
import { getSound } from '../audio/sound';

export type ActTransition = 'goo' | 'web';

const wait = (sec: number) => new Promise<void>((r) => window.setTimeout(r, sec * 1000));

function fadeEl(): HTMLElement | null {
  return document.getElementById('fade');
}

/** Leva o preto até `opacity` (0..1) em `sec` segundos. */
export async function fadeTo(opacity: number, sec: number): Promise<void> {
  const el = fadeEl();
  if (!el) return;
  el.style.transition = sec > 0 ? `opacity ${sec}s ease-in-out` : 'none';
  // Força o navegador a aplicar a transição antes de mudar a opacidade.
  void el.offsetWidth;
  el.style.opacity = String(opacity);
  if (sec > 0) await wait(sec);
}

export interface WebPullOptions {
  /** A tela que sai (puxada pela teia) e a que entra no lugar dela. */
  from: HTMLElement | null;
  to: HTMLElement | null;
  /** Onde a teia engata: o botão escolhido (ou o BACK, voltando). */
  hook: HTMLElement | null;
  /** 1: a teia vem da direita e puxa tudo para a direita; -1: vem da esquerda e puxa para a esquerda. */
  dir: 1 | -1;
  /** Mostra a tela nova (ela já entra deslizando) e, no fim, esconde a antiga. */
  showTo: () => void;
  hideFrom: () => void;
}

let splatUrl: string | null = null;

/**
 * Transição do menu (menu principal ↔ LOAD GAME, SCENES, ACHIEVEMENTS): um fio de teia sai da borda,
 * engata no botão escolhido, dá um tranco e puxa a tela para o lado, trazendo a outra no lugar.
 * Bem mais rápida que escurecer e clarear (cerca de 0,7 s).
 */
export async function webPull(o: WebPullOptions): Promise<void> {
  const layer = document.getElementById('web-pull');
  const strand = layer?.querySelector<HTMLElement>('.strand');
  const splat = layer?.querySelector<HTMLImageElement>('.splat');
  if (!layer || !strand || !splat || !o.from || !o.to) {
    o.showTo();
    o.hideFrom();
    return;
  }
  const { shootSec, hookSec, pullSec, enterLagSec } = TRANSITION.pull;
  const { sfx } = getSound();
  splatUrl ??= buildWebSplat().toCanvas().toDataURL();
  splat.src = splatUrl;

  // Onde a teia engata: a borda do botão virada para o lado de onde ela vem, na altura do meio dele.
  const W = window.innerWidth;
  const r = o.hook?.getBoundingClientRect();
  const hookX = r && r.width > 0 ? (o.dir > 0 ? r.right : r.left) : W / 2;
  const y = Math.round(r && r.height > 0 ? r.top + r.height / 2 : window.innerHeight / 2);
  const edge = o.dir > 0 ? W : 0;
  strand.style.left = `${Math.min(hookX, edge)}px`;
  strand.style.width = `${Math.abs(edge - hookX)}px`;
  strand.style.top = `${y - 1}px`;
  strand.style.transformOrigin = o.dir > 0 ? 'right center' : 'left center';
  splat.style.left = `${hookX}px`;
  splat.style.top = `${y}px`;
  splat.style.opacity = '0';
  layer.classList.remove('hidden');

  // 1. O fio sai da borda e vai até o botão.
  sfx.webShot('rope');
  const shoot = strand.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
    duration: shootSec * 1000,
    easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)',
    fill: 'forwards',
  });
  await shoot.finished;

  // 2. Engata: o respingo aparece e o botão dá um tranco para o lado da teia.
  splat.style.opacity = '1';
  if (o.hook) {
    const jerk = `translateX(${o.dir * 6}px)`;
    await o.hook.animate([{ transform: 'none' }, { transform: jerk }, { transform: 'none' }], hookSec * 1000).finished;
  } else {
    await wait(hookSec);
  }

  // 3. Puxa: a tela (com o fio grudado nela) sai para o lado e a nova entra pelo outro.
  const off = (k: number) => `translateX(${k * 110}vw)`;
  o.to.style.transform = off(-o.dir);
  o.showTo();
  sfx.whoosh();
  const out: KeyframeAnimationOptions = { duration: pullSec * 1000, easing: 'cubic-bezier(0.55, 0, 0.85, 0.35)', fill: 'forwards' };
  const anims = [
    o.from.animate([{ transform: 'none' }, { transform: off(o.dir) }], out),
    layer.animate([{ transform: 'none' }, { transform: off(o.dir) }], out),
    o.to.animate([{ transform: off(-o.dir) }, { transform: 'none' }], {
      duration: pullSec * 1000,
      delay: enterLagSec * 1000,
      easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)',
      fill: 'forwards',
    }),
  ];
  await Promise.all(anims.map((a) => a.finished));

  o.hideFrom();
  o.to.style.transform = '';
  for (const a of [shoot, ...anims]) a.cancel();
  layer.classList.add('hidden');
}

/**
 * Toca a transição de um ato. No fim a tela fica preta (`#fade` opaco): a cena nova é quem clareia
 * (com `fadeTo(0, ...)` ou só tirando o preto, se ela já começa no escuro).
 */
export function playActTransition(kind: ActTransition): Promise<void> {
  const canvas = document.getElementById('transition') as HTMLCanvasElement | null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return fadeTo(1, TRANSITION.fadeOutSec);
  const sec = kind === 'goo' ? TRANSITION.gooSec : TRANSITION.webSec;
  const draw = kind === 'goo' ? drawGoo : drawWeb;
  const seed = (Date.now() & 0xffff) + 1;
  const { sfx } = getSound();
  const cues = kind === 'goo' ? [0, 0.45] : [0, 0.18, 0.26, 0.34, 0.7];
  let cue = 0;
  let pc: PixelCanvas | null = null;
  canvas.classList.remove('hidden');

  return new Promise((resolve) => {
    const start = performance.now();
    const frame = () => {
      const t = Math.min(1, (performance.now() - start) / (sec * 1000));
      // A altura segue a proporção da janela (refeito se ela mudar).
      const h = Math.max(1, Math.round((TRANSITION.width * window.innerHeight) / Math.max(1, window.innerWidth)));
      if (!pc || pc.height !== h) {
        pc = new PixelCanvas(TRANSITION.width, h);
        canvas.width = pc.width;
        canvas.height = pc.height;
      }
      while (cue < cues.length && t >= cues[cue]) {
        if (kind === 'goo') {
          if (cue === 0) sfx.goo();
          else sfx.drip();
        } else if (cue === 0 || cue === cues.length - 1) sfx.whoosh();
        else sfx.webShot('rope');
        cue++;
      }
      draw(pc, t, seed);
      const img = ctx.createImageData(pc.width, pc.height);
      img.data.set(pc.data);
      ctx.putImageData(img, 0, 0);
      if (t < 1) {
        requestAnimationFrame(frame);
        return;
      }
      void fadeTo(1, 0);
      canvas.classList.add('hidden');
      resolve();
    };
    requestAnimationFrame(frame);
  });
}

/** Cartão de capítulo no meio da tela (#chapter): "ACT 2" e o nome embaixo; some sozinho (animação do CSS). */
export function showChapter(act: string, name: string): void {
  const el = document.getElementById('chapter');
  if (!el) return;
  const a = el.querySelector('.chapter-act');
  const n = el.querySelector('.chapter-name');
  if (a) a.textContent = act;
  if (n) n.textContent = name;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

export function hideChapter(): void {
  document.getElementById('chapter')?.classList.remove('show');
}
