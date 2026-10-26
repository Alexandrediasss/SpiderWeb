// Galeria em http://localhost:5173/art.html: sprites ampliados e um botão para ouvir a música.
import { SPIDER } from './config';
import { MusicPlayer } from './audio/MusicPlayer';
import { PixelCanvas } from './art/PixelCanvas';
import { DECOR_PAINTERS } from './art/decorArt';
import { bakeLevel } from './art/levelBaker';
import { SPIDER_FRAMES, buildReticle, buildSpiderSheet } from './art/spiderArt';
import { DECORATIONS, HOUSE_MAP, ROOMS } from './level/houseMap';

const root = document.getElementById('root')!;

// Música: botão para ouvir o tema sem abrir o jogo.
const music = new MusicPlayer();
const musicButton = document.createElement('button');
musicButton.textContent = '▶ Tocar música';
musicButton.style.cssText = 'font: 14px monospace; padding: 8px 14px; cursor: pointer;';
musicButton.onclick = () => {
  if (musicButton.dataset.started) music.toggleMute();
  else music.start();
  musicButton.dataset.started = '1';
  musicButton.textContent = music.isMuted ? '▶ Tocar música' : '■ Silenciar música';
};
root.append(musicButton);

function show(title: string, pc: PixelCanvas, scale: number): void {
  const h = document.createElement('h2');
  h.textContent = title;
  const canvas = pc.toCanvas();
  canvas.style.width = `${pc.width * scale}px`;
  canvas.style.height = `${pc.height * scale}px`;
  root.append(h, canvas);
}

const sheet = buildSpiderSheet();
show(`Aranha: ${SPIDER_FRAMES.map((f) => f.name).join(', ')}`, sheet, 8);

// Cada quadro separado com a hitbox desenhada embaixo para conferir o alinhamento dos pés.
const framesWithBox = new PixelCanvas(sheet.width, sheet.height + 4);
framesWithBox.blit(sheet, 0, 0);
SPIDER_FRAMES.forEach((_, i) => framesWithBox.rect(i * SPIDER.frameW, SPIDER.frameH, SPIDER.frameW, 1, 0x00ff66));
show('Quadros + linha do chão (verde)', framesWithBox, 6);

show('Mira', buildReticle(), 8);

const decor = new PixelCanvas(360, 80);
(Object.keys(DECOR_PAINTERS) as (keyof typeof DECOR_PAINTERS)[]).forEach((k, i) => {
  DECOR_PAINTERS[k](decor, 4 + (i % 9) * 40, 12, false);
});
show('Decorações', decor, 3);

show('Cenário completo', bakeLevel(HOUSE_MAP, ROOMS, DECORATIONS), 1);
