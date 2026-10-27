# Spider Web

Jogo 2D em pixel art onde você é uma aranha explorando uma casa numa noite de tempestade: anda em paredes e tetos, corre e se balança com teias. A casa está escura, iluminada pelas luminárias; lá fora chove e de vez em quando cai um raio.
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
  systems/           LÓGICA PURA, sem Phaser: SpiderMotor, teia, input abstrato, controle, tempestade (raios/trovões)
  level/             mapa ASCII da casa + legenda + cômodos + decorações
  art/               pixel art gerada por código (sem PNG): paleta, sprites, tiles, "bake" do cenário, mapas de luz
  audio/             som gerado por código (sem MP3): AudioHub, música (partitura + piano), chuva, trovão, passos
  entities/          objetos Phaser que desenham a lógica (Spider = sprite + teia; Atmosphere = luz, chuva, raios)
  scenes/            BootScene (gera texturas), GameScene (tela inicial + jogo), HUD e tela inicial em HTML
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
- Tela inicial (título, Play, transição para o jogo): [docs/features/title-screen.md](docs/features/title-screen.md)
- Música (partitura, piano sintetizado, loop; só na tela inicial): [docs/features/music.md](docs/features/music.md)
- Controle/gamepad (mapa de botões, zona morta, mira estável e assistida, vibração): [docs/features/gamepad.md](docs/features/gamepad.md)

## Debug

- Tecla `G` no jogo mostra a hitbox, o estado da aranha e quanto falta para o próximo raio.
- Em dev, ficam no console do navegador: `window.__spider` (o `SpiderMotor`), `window.__scene` (a `GameScene`), `window.__music` (o `MusicPlayer`), `window.__storm` (o `Storm`: `__storm.strike(true)` faz cair um raio perto agora) e `window.__audio` (o `AudioHub`).
- Galeria em http://localhost:5173/art.html: mostra a aranha, as decorações, o cenário com e sem a luz da noite, o mapa de luz e o do relâmpago, e tem um botão para ouvir a música.
- Para testar o controle sem ter um: no console, troque `navigator.getGamepads` por uma função que devolve um objeto falso com `mapping: 'standard'`, `axes` e `buttons` (veja `tests/gamepad.test.ts`).
- Para checar o áudio sem ouvir: renderize com `OfflineAudioContext` (+ `PianoSynth`, `StormSounds` ou `Footsteps`) e meça o pico e o RMS (sem clipping, pico abaixo de 1). Dá para importar os módulos no console do dev server com `await import('/src/audio/StormSounds.ts')`.
- O painel do navegador do app pode deixar a página em segundo plano: o Phaser só termina o boot quando ela fica visível (um clique resolve).
