// Transições de tela em HTML por cima do jogo: o escurecer (#fade) e a transição de cada ato (#transition).
// Spec: docs/features/transitions.md
import { TRANSITION } from '../config';
import { PixelCanvas } from '../art/PixelCanvas';
import { drawGoo, drawWeb } from '../art/transitionArt';
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

/** Escurece, troca o que está por baixo (`swap`) e clareia. */
export async function fadeSwap(swap: () => void): Promise<void> {
  await fadeTo(1, TRANSITION.fadeOutSec);
  swap();
  await wait(TRANSITION.fadeHoldSec);
  await fadeTo(0, TRANSITION.fadeInSec);
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
