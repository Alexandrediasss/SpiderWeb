# Spider Web

Jogo 2D em pixel art onde você é uma aranha explorando uma casa numa noite de tempestade: anda em paredes e tetos, corre e se balança com teias. A casa está escura, iluminada pelas luminárias; lá fora chove e de vez em quando cai um raio. Ratos patrulham partes da casa e mordem (3 de vida); a aranha se defende com teias de ataque e de prender. Pela casa há cartas do pai da família contando a invasão dos zumbis. Fluxo: menu principal (NEW GAME, LOAD GAME, SCENES para rever as cutscenes já vistas e o resumo cinematográfico de cada ato terminado, e ACHIEVEMENTS com as conquistas de cada ato) → seleção de atos (estilo Telltale) → cutscene de abertura → jogo. O ato 1 termina no buraco do telhado do sótão: cutscene da rua (a horda de zumbis) → "END OF ACT 1" → seleção de atos. O ato 2 (liberado depois do 1) é a travessia da rua por cima dos postes, na ventania (como no Celeste), até a chaminé da casa vizinha; cair na rua é ser pisada por um zumbi. Cada ato tem a sua transição (gosma verde, teia e vento).
Visão de design completa: [docs/GDD.md](docs/GDD.md).

## Stack e comandos

- Phaser 3.90 + TypeScript + Vite. Node 24 no PATH (desenvolvido no Windows; `.claude/launch.json` chama só `npm`).
- `npm run dev`: servidor em http://localhost:5173
- `npm test`: testes (Vitest) da lógica pura
- `npm run typecheck`: checa os tipos
- `npm run build`: build de produção em `dist/`

## Arquitetura

```
src/
  config.ts          todas as constantes ajustáveis (velocidades, gravidade, luz, tempestade, volumes)
  main.ts            cria o Phaser.Game
  physics/           LÓGICA PURA, sem Phaser: grade de tiles (com linha de visão), colisão AABB, superfícies
  systems/           LÓGICA PURA, sem Phaser: SpiderMotor, teia, input, controle, tempestade, ratos, combate, cutscene, horda, buraco do telhado, cartas, progresso salvo, conquistas, vento, detritos, fios soltos, checkpoints, resumo dos atos (diretor que pilota a aranha)
  level/             mapa ASCII da casa + legenda + cômodos + decorações + ratos + texto da história (story.ts) + cartas (letters.ts) + atos (acts.ts) + conquistas (achievements.ts) + cenas do SCENES (scenes.ts) + roteiro dos resumos (recaps.ts) + mapa do ato 2 (rooftops.ts)
  art/               pixel art gerada por código (sem PNG): paleta, sprites (aranha, rato, corações, zumbis), tiles, cenário, rua, luz, cartas, arte dos atos, miniaturas das cenas, rua do ato 2, transições
  audio/             som gerado por código (sem MP3): música, chuva, trovão, passos, guinchos/chiados, gemidos, papel, vento, choque, pisada; `sound.ts` cria tudo uma vez
  entities/          objetos Phaser que desenham a lógica (Spider; Atmosphere = luz/chuva/raios; CombatView = ratos/teias; LetterSprites = cartas; Weather = chuva/vento do ato 2; Hazards = fios e detritos)
  scenes/            BootScene (texturas), GameScene (menu, atos, ato 1, resumo do ato 1), IntroScene e StreetScene (cutscenes), RooftopScene (ato 2 e o resumo dele), Transitions (teia que puxa as telas do menu, escurecer e transição de ato), cinema (faixas pretas e legenda), HUD e menus em HTML (SCENES, ACHIEVEMENTS, pausa...)
tests/               testes Vitest da lógica pura
docs/                GDD + uma spec por feature
```

## Regras do projeto

1. **`physics/` e `systems/` nunca importam Phaser.** Ficam testáveis no Node. O Phaser só aparece em `scenes/`, `entities/` e `art/` (e mesmo em `art/`, `lighting.ts`, `levelBaker.ts` e `levelArt.ts` são puros e testados).
2. **Números de ajuste ficam em `src/config.ts`.** Nada de número mágico de gameplay espalhado pelo código. Cores ficam em `src/art/palette.ts`.
3. **Arte e som são código.** Sprites são strings ASCII + paleta, ou funções de desenho pixel a pixel; a luz é calculada pixel a pixel; a música é uma partitura em `src/audio/score.ts` tocada por um piano sintetizado; chuva, trovão e passos são ruído sintetizado. Não adicione PNG ou MP3 sem combinar antes.
4. **O cenário é o mapa ASCII em `src/level/houseMap.ts`.** A legenda fica em `src/level/legend.ts`. Minúscula = sólido, maiúscula = versão de fundo (não colide).
5. Unidades: pixels do mundo; 1 tile = 16 px; resolução interna de 480×270, escalada sem suavização.
6. Código em inglês, comentários e docs em português. **Textos do jogo (interface) em inglês.**

## Fluxo para uma feature nova

1. Escreva ou atualize a spec em `docs/features/<feature>.md`: regras, controles, casos de borda.
2. Implemente a lógica pura primeiro e teste em `tests/`.
3. Depois ligue no Phaser (entities/scenes).
4. Rode `npm test && npm run typecheck` e teste no navegador.
5. Atualize o GDD se mudar alguma coisa de design.

## Docs: leia só o que for usar

- Movimento em superfícies (paredes, teto, cantos): [docs/features/surface-movement.md](docs/features/surface-movement.md)
- Teia e balanço: [docs/features/web-swing.md](docs/features/web-swing.md)
- Pixel art, paleta, tiles e como editar o mapa: [docs/art-and-level.md](docs/art-and-level.md)
- Noite chuvosa (luz das luminárias, chuva, relâmpagos, trovões, passos): [docs/features/atmosphere.md](docs/features/atmosphere.md)
- Menu principal (NEW GAME, LOAD GAME, SCENES, ACHIEVEMENTS, confirmação do jogo novo): [docs/features/title-screen.md](docs/features/title-screen.md)
- Conquistas (lista, quando libera, aviso na tela, tela do menu, salvo separado do jogo): [docs/features/achievements.md](docs/features/achievements.md)
- SCENES (rever cutscenes vistas no jogo, como no *Sonic Generations*; resumo cinematográfico de cada ato terminado, com a aranha pilotada por um roteiro e testado com a física de verdade): [docs/features/scenes.md](docs/features/scenes.md)
- Cutscene de abertura (texto, despertar no líquido mutante, buraco de rato, como editar): [docs/features/intro.md](docs/features/intro.md)
- Buraco no telhado e cutscene da rua (horda de zumbis, câmera subindo das pernas às cabeças, gemidos; é o fim do ato 1): [docs/features/street-cutscene.md](docs/features/street-cutscene.md)
- Cartas do pai (onde ficam, aviso READ, página com as patas, texto): [docs/features/letters.md](docs/features/letters.md)
- Atos (seleção estilo Telltale, fim do ato, liberar ato, progresso salvo no navegador): [docs/features/acts.md](docs/features/acts.md)
- Transições (teia que puxa as telas do menu, gosma verde do ato 1, teia e vento do ato 2): [docs/features/transitions.md](docs/features/transitions.md)
- Ato 2, ROOFTOPS (mapa da rua, cutscenes de abertura e da chaminé, checkpoints, pisada do zumbi): [docs/features/act2-rooftops.md](docs/features/act2-rooftops.md)
- Ventania do ato 2 (rajadas como no Celeste, detritos, fios soltos com faísca): [docs/features/wind.md](docs/features/wind.md)
- Ratos, vida, mordida, teias de ataque e de prender, sons de dano: [docs/features/combat.md](docs/features/combat.md)
- Menu de pausa (Resume, Restart, Main Menu; reinício da cena): [docs/features/pause-menu.md](docs/features/pause-menu.md)
- Música (partitura, piano sintetizado, loop; só na tela inicial): [docs/features/music.md](docs/features/music.md)
- Controle/gamepad (mapa de botões, zona morta, mira estável e assistida, vibração): [docs/features/gamepad.md](docs/features/gamepad.md)

## Debug

- Tecla `G` no jogo mostra as hitboxes (aranha e ratos), o estado da aranha, a vida, o estado de cada rato e quanto falta para o próximo raio.
- Em dev, ficam no console do navegador:
  - `window.__spider` (o `SpiderMotor`) e `window.__scene` (a `GameScene`);
  - `window.__combat` (vida e ratos: `__combat.health.hp = 99` para testar à vontade);
  - `window.__storm` (o `Storm`: `__storm.strike(true)` faz cair um raio perto agora);
  - `window.__music` (o `MusicPlayer`) e `window.__audio` (o `AudioHub`);
  - `__scene.goToStreet()` começa a cutscene da rua na hora; durante ela, `window.__street` é a `StreetScene`;
  - `__scene.openLetter('table')` (ou `'bed'`, `'attic'`) abre uma carta; `__scene.endAct()` mostra o fim do ato;
  - `__spider.placeAt(x, y)` teleporta a aranha (px do mundo; ela cai e gruda no que estiver embaixo);
  - `localStorage.removeItem('spiderweb.achievements')` zera as conquistas (ficam separadas do jogo salvo; o NEW GAME não apaga); `(await import('/src/scenes/AchievementToast.ts')).achieve({ type: 'actEnd', act: 'act1' })` libera uma na hora;
  - `localStorage.removeItem('spiderweb.scenes')` tranca de novo as cenas do SCENES (também separadas do jogo salvo); `localStorage.setItem('spiderweb.scenes', '["act1-intro","act1-recap","act1-street","act2-intro","act2-recap","act2-ending"]')` libera todas. `__scene.scene.restart({ openScenes: 'act1-recap' })` abre o SCENES direto e `__scene.scene.restart({ recap: true })` roda o resumo do ato 1 (`__scene.recap.director` mostra o plano e a ação; mais em [docs/features/scenes.md](docs/features/scenes.md));
  - `localStorage.removeItem('spiderweb.progress')` zera o progresso salvo (para liberar o ato 2 sem jogar o 1: `localStorage.setItem('spiderweb.progress', '{"completed":["act1"]}')`);
  - no ato 2: `__scene2` é a `RooftopScene` (`__scene2.respawn()`, `__scene2.checkpoint = 2`, `__scene2.startEnding()`), `__wind.forceGust(-1)` faz vir uma rajada contra agora, e `__spider.placeAt(x, y)` funciona igual. Para abrir o ato 2 direto: `__scene.game.scene.stop('game'); __scene.game.scene.start('act2', { intro: true })`.
- Galeria em http://localhost:5173/art.html: mostra a aranha, o rato (e o rato preso), os corações, as cartas (folhinha e páginas), a arte dos atos, quadros das transições, a rua do ato 2 inteira, o pé do zumbi e os detritos, os zumbis, as decorações, os cenários da rua, o cenário com e sem a luz da noite, o mapa de luz e o do relâmpago, e tem botões para ouvir a música e a horda.
- Para testar o controle sem ter um: no console, troque `navigator.getGamepads` por uma função que devolve um objeto falso com `mapping: 'standard'`, `axes` e `buttons` (veja `tests/gamepad.test.ts`).
- Para checar o áudio sem ouvir: renderize com `OfflineAudioContext` (+ `PianoSynth`, `StormSounds`, `Footsteps` ou `Sfx`) e meça o pico e o RMS (sem clipping, pico abaixo de 1). Dá para importar os módulos no console do dev server com `await import('/src/audio/StormSounds.ts')`.
  - Compare também acima de 250 Hz (passa-alta antes de medir): é o que caixinhas de notebook tocam. Um som só de grave "não existe" para quem joga no notebook.
- O painel do navegador do app pode deixar a página em segundo plano: o Phaser só termina o boot quando ela fica visível (um clique resolve).
- Cutscene sem esperar: `const intro = __scene.game.scene.getScene('intro')` e mude `intro.elapsed` (veja os nomes em `intro.tl.steps`); `intro.done = true` congela o quadro para olhar. Na da rua, o mesmo com `__street.elapsed` (o plano troca sozinho).
- Teclas no painel do navegador do app: a ferramenta de tecla pode não mandar `keyCode`, e o Phaser usa `keyCode`. Para testar `F`, `Esc` etc. no jogo, dispare `new KeyboardEvent('keydown', { code: 'KeyF', keyCode: 70 })` no `window`.
- **O Phaser reaproveita a mesma instância da cena** em `scene.start`/`restart`: os campos da classe não voltam ao valor inicial. Todo estado (modo, travas, contadores) precisa ser zerado no começo de `create()`. Foi assim que a trava `fading` da `GameScene` ficou ligada depois do ato 1 e a seleção de atos parou de responder.
- O painel do navegador do app quase não roda quadros quando está em segundo plano. Para testar um caminho longo, rode os quadros na mão no console: `const g = __scene.game; let t = performance.now(); for (let i = 0; i < 60; i++) g.loop.step((t += 16.7))`.
- Testes de HTML: confira o estilo calculado (`getComputedStyle(el).display`), não só a classe. Foi assim que o título "escondido" continuou aparecendo.
- Botões de menu: meça o `getBoundingClientRect()` de todos com cada um selecionado (troque a classe `selected` no console). O tamanho tem que ser o mesmo; foi assim que o ACHIEVEMENTS alargava o menu.
- Animações HTML (a teia que puxa o menu usa `element.animate`): com o painel do navegador escondido elas não andam. Tire screenshots para avançar, ou estique os tempos no console (`(await import('/src/config.ts')).TRANSITION.pull.pullSec = 4`) para ver os quadros do meio.
- Cutscene que "trava": confira se aparece o aviso de pular e se pular passa por um escurecer. Teleportar a aranha com a câmera seguindo dá a impressão de bug.
- Arte de tile sólido: o desenho precisa ir até a borda do tile (a colisão é o tile inteiro). Se a aranha parece flutuar perto de uma peça, é desenho mais fino que o tile (veja [docs/art-and-level.md](docs/art-and-level.md)).
