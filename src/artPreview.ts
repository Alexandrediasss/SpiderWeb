// Galeria em http://localhost:5173/art.html: sprites ampliados, o cenário de dia e à noite, e um botão para ouvir a música.
import { SPIDER } from './config';
import { AudioHub } from './audio/AudioHub';
import { MusicPlayer } from './audio/MusicPlayer';
import { PixelCanvas } from './art/PixelCanvas';
import { DECOR_PAINTERS, paintDecor } from './art/decorArt';
import { getLevelArt } from './art/levelArt';
import { STAGE, buildGooBlob, buildGooPuddle, buildIntroDarkness, buildIntroStage } from './art/introArt';
import { composeLit } from './art/lighting';
import { RAT_FRAME, RAT_POSES, buildHearts, buildRatSheets, buildRatWeb } from './art/ratArt';
import { SPIDER_FRAMES, buildReticle, buildSpiderSheet } from './art/spiderArt';
import type { DecorKind } from './level/houseMap';

const root = document.getElementById('root')!;

// Música: botão para ouvir o tema sem abrir o jogo.
let hub: AudioHub | null = null;
const musicButton = document.createElement('button');
musicButton.textContent = '▶ Tocar música';
musicButton.style.cssText = 'font: 14px monospace; padding: 8px 14px; cursor: pointer;';
musicButton.onclick = () => {
  if (!hub) {
    hub = new AudioHub();
    hub.unlockOnGesture();
    new MusicPlayer(hub.ctx, hub.input).start();
  } else {
    hub.toggleMute();
  }
  musicButton.textContent = hub.isMuted ? '▶ Tocar música' : '■ Silenciar música';
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

const rat = buildRatSheets();
show(`Rato: ${RAT_POSES.map((p) => p.name).join(', ')}`, rat.body, 8);
show('Olhos do rato (brilham no escuro)', rat.eyes, 4);
const trapped = new PixelCanvas(RAT_FRAME.w, RAT_FRAME.h);
trapped.blit(rat.body, 0, 0);
trapped.blit(buildRatWeb(), 0, 0);
show('Rato preso na teia', trapped, 8);
show('Vida: cheio e vazio', buildHearts(), 8);

const kinds = Object.keys(DECOR_PAINTERS) as DecorKind[];
const decor = new PixelCanvas(8 + kinds.length * 44, 80);
kinds.forEach((k, i) => paintDecor(k, decor, 4 + i * 44, 12));
show('Decorações', decor, 3);

// Cutscene: o palco já com a escuridão (só a luz do cano e a do buraco), a bolha e a poça verdes.
const stage = buildIntroStage();
stage.blit(buildGooPuddle(), STAGE.spiderX - 15, STAGE.floorY - 2);
stage.blit(buildGooBlob(), STAGE.spiderX - 10, STAGE.floorY - 8);
stage.blit(buildIntroDarkness(true), 0, 0);
show('Cutscene: dentro da parede (com a luz do buraco)', stage, 4);

const art = getLevelArt();
show('Cenário à noite (com a luz das luminárias)', composeLit(art.canvas, art, art.lamps), 1);
show('Cenário sem luz (cores pintadas)', art.canvas, 1);
show('Mapa de luz', art.light, 1);
show('Luz do relâmpago (alfa)', art.flash, 1);
