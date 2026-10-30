# Spec: transições de tela

Três transições, todas em HTML/canvas por cima do jogo (o Phaser continua rodando atrás):

| Quando | Transição |
|---|---|
| Menu principal → seleção de atos (LOAD GAME), SCENES ou ACHIEVEMENTS (e o BACK de volta) | **Teia que puxa**: um fio de teia sai da borda, engata no botão escolhido e puxa a tela para o lado, trazendo a outra no lugar (cerca de 0,7 s). |
| Fim do ato → seleção de atos | A tela (já preta) clareia na seleção de atos. |
| SCENES → assistir uma cena (e a volta) | Escurece em `RECAP.enterFadeSec` e a cena começa; no fim ela escurece e o SCENES clareia em `TRANSITION.fadeInSec`, com a mesma cena escolhida ([scenes.md](scenes.md)). |
| Escolher o **ato 1** (ou NEW GAME) | **Gosma verde**: o líquido mutante espirra na "lente" e escorre do alto até cobrir tudo; o verde apaga para o preto e começa a cutscene de abertura. |
| Escolher o **ato 2** | **Teia e vento**: riscos de vento cruzam a tela, fios de teia saem das bordas e tecem uma teia no meio enquanto o fundo escurece; uma rajada arranca a teia e começa o ato 2. |

Código:
- `src/art/transitionArt.ts`: lógica pura. Desenha um quadro de cada transição num `PixelCanvas` de baixa resolução, a partir do tempo (0..1).
- `src/scenes/Transitions.ts`: o escurecer (`#fade`) e a transição de ato (`#transition`, um canvas esticado com `image-rendering: pixelated`).

Testes: `tests/transitionArt.test.ts`.

## Teia que puxa (entre as telas do menu)

Antes era escurecer e clarear (1,7 s para ir e mais 1,7 s para voltar): longo demais para só trocar de tela. Agora (`webPull` em `Transitions.ts`, tempos em `TRANSITION.pull`):

1. **Atirar (`shootSec`, 0,14 s):** um fio de teia (2 px, cor de teia) sai da borda da tela e vai até o botão escolhido, na altura do meio dele. Som de teia (`Sfx.webShot`).
2. **Engatar (`hookSec`, 0,08 s):** aparece um respingo de teia em pixel art (`buildWebSplat` em `uiArt.ts`) no ponto onde engatou, e o botão dá um tranco de 6 px para o lado da teia.
3. **Puxar (`pullSec`, 0,42 s):** a tela atual sai para o lado da teia (acelerando), levando o fio junto. A tela nova entra pelo outro lado (desacelerando, com `enterLagSec` de atraso). Som de vento (`Sfx.whoosh`).

- **Ir** (LOAD GAME, SCENES, ACHIEVEMENTS): a teia vem da **direita**, engata no botão escolhido e puxa o menu para a direita; a tela nova entra pela esquerda.
- **Voltar** (BACK): o contrário. A teia vem da **esquerda**, engata no BACK e puxa para a esquerda; o menu principal entra pela direita.
- Durante a transição, teclas e botões ficam ignorados (`GameScene.fading`).
- A música continua tocando.
- É feita com a Web Animations API (`element.animate`) em cima das telas HTML. No fim, as animações são canceladas e o `transform` volta ao normal.

Teste no painel do navegador do app: com o painel escondido, o navegador não roda quadros e a animação fica parada. Tire screenshots para ela andar, ou aumente os tempos de `TRANSITION.pull` no console para ver os quadros do meio.

## Escurecer (fim do ato)

1. Voltando do fim do ato, a tela já está preta: só clareia em `TRANSITION.fadeInSec`, já na seleção de atos.

## Gosma verde (ato 1)

Duração `TRANSITION.gooSec`. Em baixa resolução (160 px de largura, altura pela proporção da janela):
1. **Respingos (0–25%):** 5 a 7 manchas de gosma batem na tela e crescem rápido, com gotinhas em volta, como líquido espirrando na câmera.
2. **Escorrer (15–70%):** do alto descem fios grossos com a ponta redonda, cada um numa velocidade; as manchas também escorrem. No fim, tudo está coberto.
3. **Apagar (70–100%):** o verde escurece até o preto, com umas bolhas brilhando por último.
4. Som: espirro molhado (`Sfx.goo`) no começo e um "plip" no meio. A música some junto.

## Teia e vento (ato 2)

Duração `TRANSITION.webSec`:
1. **Vento (0–30%):** riscos brancos horizontais cruzam a tela da esquerda para a direita, cada vez mais.
2. **Teia (15–65%):** fios saem das bordas até um centro (os raios da teia); depois a espiral é tecida de fora para dentro. O fundo escurece até o preto.
3. **Rajada (70–100%):** os fios são arrastados para a direita, se esticam e somem. Fica o preto.
4. Som: assobio de vento (`Sfx.whoosh`) e "fiuu" de teia a cada fio.

## Casos de borda

- **Redimensionar a janela no meio:** o canvas é refeito no próximo quadro com a nova proporção.
- **Fim da transição:** a tela fica preta (`#fade` opaco) até a cena nova começar; ela é quem clareia.
