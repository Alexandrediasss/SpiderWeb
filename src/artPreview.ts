// Galeria em http://localhost:5173/art.html: sprites ampliados, o cenário de dia e à noite, e botões para ouvir a música e a horda.
import { SPIDER } from './config';
import { AudioHub } from './audio/AudioHub';
import { MusicPlayer } from './audio/MusicPlayer';
import { ZombieVoices } from './audio/ZombieVoices';
import {
  GROUND_ANCHOR,
  HOUSES_BASE,
  buildFarGround,
  buildHouses,
  buildMidGround,
  buildNearGround,
  buildRoofEdge,
  buildRoofShot,
  buildStreetSky,
  buildWideStreet,
} from './art/streetArt';
import { buildZombieSheets } from './art/zombieArt';
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

// Horda: um coro de gemidos e passos por alguns segundos.
const hordeButton = document.createElement('button');
hordeButton.textContent = '▶ Ouvir a horda';
hordeButton.style.cssText = musicButton.style.cssText + ' margin-left: 8px;';
hordeButton.onclick = () => {
  const zh = new AudioHub();
  zh.unlockOnGesture();
  const voices = new ZombieVoices(zh.ctx, zh.input);
  for (let i = 0; i < 14; i++) {
    setTimeout(() => {
      voices.groan({ pan: ((i * 37) % 10) / 6 - 0.8, volume: i % 3 === 0 ? 1 : 0.6, seed: 500 + i * 131 });
      voices.step((i % 4) / 2 - 0.75, 1);
    }, i * 420);
  }
  setTimeout(() => zh.close(), 9000);
};
root.append(hordeButton);

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

// Cutscene da rua.
show('Zumbis (bloco de 4 px): visuais × quadros da caminhada', buildZombieSheets(4).body, 2);
show('Olhos dos zumbis (escurecem menos no escuro)', buildZombieSheets(4).eyes, 1);
show('Multidão (bloco de 1 px)', buildZombieSheets(1).body, 4);
const roofShot = buildStreetSky(160, 90);
const roofParts = buildRoofShot();
roofShot.blit(roofParts.roof, 0, 0);
show('Plano 1: telhado visto de fora, com o buraco', roofShot, 4);
const street = buildStreetSky(240, 160);
street.blit(buildHouses(), 0, 96 - HOUSES_BASE);
street.blit(buildFarGround(), 0, 118 - GROUND_ANCHOR.far);
show('Plano 2: casas do outro lado da rua (fim da subida)', street, 3);
for (const [title, pc] of [
  ['Chão: calçada de lá', buildFarGround()],
  ['Chão: asfalto', buildMidGround()],
  ['Chão: calçada de cá', buildNearGround()],
  ['Plano 3: a rua vista do telhado', buildWideStreet()],
  ['Plano 3: beira do telhado com a calha', buildRoofEdge()],
] as const) {
  show(title, pc, 3);
}

const art = getLevelArt();
show('Cenário à noite (com a luz das luminárias)', composeLit(art.canvas, art, art.lamps), 1);
show('Cenário sem luz (cores pintadas)', art.canvas, 1);
show('Mapa de luz', art.light, 1);
show('Luz do relâmpago (alfa)', art.flash, 1);
