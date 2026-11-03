# Spec: falas da Mary (caixa de diálogo)

A partir do ato 3 a aranha fala. As falas aparecem numa caixa de diálogo como a do *Stardew Valley*: a moldura de madeira, o texto aparecendo letra por letra e o retrato em pixel art. Aqui o retrato fica **à esquerda**, com o nome `MARY` embaixo. Enquanto o texto aparece, toca a "voz" dela: um "tststs" baixinho, como as falas do *Hollow Knight*.

Código:
- `src/level/dialogues.ts`: as falas (em inglês; os originais em português estão em [docs/story.md](../story.md)).
- `src/systems/dialogue.ts`: lógica pura. O texto aparecendo, avançar, completar a linha e as sílabas da voz.
- `src/art/portraitArt.ts`: o retrato da Mary (rosto de aranha de frente, 48×48) em quatro humores.
- `src/audio/Sfx.ts`: `voice` (o "ts" de cada sílaba).
- `src/scenes/DialogueBox.ts`: a caixa em HTML (`#dialogue` em `index.html`).

Testes: `tests/dialogue.test.ts`.

## A caixa

- Na base da tela, ocupando quase toda a largura.
- **Esquerda:** o retrato numa moldura de madeira e, embaixo, uma plaquinha com `MARY`.
- **Direita:** o papel claro com o texto (fonte de pixel), e uma setinha piscando no canto quando a linha terminou.
- O jogo para enquanto a caixa está aberta (como a carta).

## Humores do retrato

| Humor | Como fica |
|---|---|
| `normal` | Olhos grandes e brilhantes, sobrancelhas de pelinho retas. |
| `surprised` | Olhos arregalados (brilho maior), sobrancelhas lá em cima, boquinha aberta. |
| `sad` | Pálpebras caídas, sobrancelhas tortas para cima no meio. |
| `cry` | Triste e com lágrimas escorrendo (o nome do jogo). |

## Regras

1. **Letra por letra:** `DIALOGUE.cps` letras por segundo; nas pausas (`.`, `,`, `!`, `?`, `…`) espera um pouco mais.
2. **Voz:** um "ts" a cada `DIALOGUE.blipEvery` letras (espaços e pontuação não contam). Triste, a voz sai mais grave e baixa.
3. **Avançar** (`F`, `Enter`, `Espaço`, clique; `A` ou `Y` no controle):
   - com o texto ainda aparecendo: mostra a linha inteira;
   - com a linha inteira: passa para a próxima;
   - na última: fecha e o jogo volta.
4. **Quando a Mary fala** (cada fala uma vez por jogada do ato):
   - `arrival`: logo depois da cutscene de chegada;
   - `day35`: ao fechar a carta do Dia 35;
   - `day40`: ao fechar a carta do Dia 40 (ela chora).
