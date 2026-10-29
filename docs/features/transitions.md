# Spec: transições de tela

Três transições, todas em HTML/canvas por cima do jogo (o Phaser continua rodando atrás):

| Quando | Transição |
|---|---|
| PLAY na tela inicial → seleção de atos (e o BACK de volta) | A tela escurece devagar e clareia já na outra tela. |
| Escolher o **ato 1** | **Gosma verde**: o líquido mutante espirra na "lente" e escorre do alto até cobrir tudo; o verde apaga para o preto e começa a cutscene de abertura. |
| Escolher o **ato 2** | **Teia e vento**: riscos de vento cruzam a tela, fios de teia saem das bordas e tecem uma teia no meio enquanto o fundo escurece; uma rajada arranca a teia e começa o ato 2. |

Código:
- `src/art/transitionArt.ts`: lógica pura. Desenha um quadro de cada transição num `PixelCanvas` de baixa resolução, a partir do tempo (0..1).
- `src/scenes/Transitions.ts`: o escurecer (`#fade`) e a transição de ato (`#transition`, um canvas esticado com `image-rendering: pixelated`).

Testes: `tests/transitionArt.test.ts`.

## Escurecer (PLAY e BACK)

1. A tela vai ao preto em `TRANSITION.fadeOutSec`, fica preta por `TRANSITION.fadeHoldSec`, troca a tela por baixo e clareia em `TRANSITION.fadeInSec`.
2. Durante a troca, teclas e botões da tela nova ficam ignorados (a seleção de atos já tem a espera de 250 ms).
3. A música continua tocando.

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
