# Spec: controle (gamepad)

Código:
- `src/systems/gamepad.ts`: lógica pura. Cuida do mapa de botões, da zona morta, da mira estável, da mira assistida e da mescla com teclado/mouse.
- `src/scenes/PlayerInput.ts`: lê a Gamepad API do navegador (`navigator.getGamepads()`), sem o plugin de gamepad do Phaser.

Testes: `tests/gamepad.test.ts`.

Testado com o 8BitDo Ultimate 2C com fio no Windows (modo XInput, que aparece como controle de Xbox). Qualquer controle que o navegador reconheça com `mapping === 'standard'` funciona com o mesmo mapa.

## Controles

| Ação | Controle (layout Xbox) |
|---|---|
| Andar | Analógico esquerdo ou D-pad (mesmas regras de `A`/`D`/`W`/`S`) |
| Correr | Segurar `LT` ou `LB` |
| Pular / soltar da superfície | `A` |
| Mirar | Analógico direito |
| Teia de balanço | Segurar `RB` ou `RT` |
| Subir / descer na teia | Analógico esquerdo para cima/baixo |
| Balançar | Analógico esquerdo para os lados |
| Teia de ataque (tira vida) | `X` |
| Teia que prende (5 s) | `B` |
| Começar (tela inicial) | `A` ou `Start` |
| Pausar | `Start` / `Menu` (no menu: ↑/↓ escolhe, `A` confirma, `B` volta) |
| Som liga/desliga | `Select` / `View` (botão da esquerda no centro) |

Teias de combate e ratos: [combat.md](combat.md). Menu de pausa: [pause-menu.md](pause-menu.md).

## Regras

1. **Índices do mapa padrão** (W3C "standard gamepad"):
   - botões: `A=0`, `B=1`, `X=2`, `LB=4`, `RB=5`, `LT=6`, `RT=7`, `Select=8`, `Start=9`, D-pad `12–15`;
   - analógico esquerdo nos eixos `0/1`, direito nos eixos `2/3`.
2. **Zona morta radial:** abaixo de `GAMEPAD.moveDeadzone` o analógico conta como solto. Acima, a magnitude é reescalada para começar do zero.
3. **Movimento em 8 direções:** o analógico esquerdo é "encaixado" na direção mais próxima entre 8 (setores de 45°) e vira `-1/0/1` em cada eixo, como o teclado.
   - Isso é necessário porque a trava de cantos (`surface-movement.md`) compara o *sinal* do input: um analógico tremendo entre "direita" e "direita+baixo" desfaria a trava.
   - Na parede, um leve desvio para baixo faria a aranha descer em vez de subir.
4. **Gatilhos:** `LT`/`RT` contam como apertados quando `value >= GAMEPAD.triggerThreshold`.
5. **Mira:** o analógico direito define uma **direção** a partir do centro da aranha (estilo *twin-stick*). Abaixo de `GAMEPAD.aimDeadzone`, mantém a última direção usada; a direção inicial é para cima.
6. **Mira estável ao soltar o analógico:** `X` e `B` ficam no polegar direito, então o jogador mira, solta o analógico e aperta o botão. Ao soltar, o analógico volta ao centro passando por leituras fracas e tortas (às vezes até passa do centro).
   - O leitor lembra a maior inclinação dos últimos `GAMEPAD.aimHoldMs` ms.
   - Só aceita uma direção nova se a inclinação atual for pelo menos `GAMEPAD.aimReleaseRatio` desse pico.
   - Resultado: o "solavanco" da volta é ignorado, mas mirar devagar com o analógico meio inclinado continua funcionando.
7. **Mira assistida:**
   - Teia de balanço: se o raio na direção mirada não acerta nada dentro do alcance, a mira gira aos poucos para os dois lados (até `GAMEPAD.aimAssistDeg`) e usa a primeira direção que acerta. Se nada no cone acerta, fica a direção original (retícula cinza).
   - Teias de combate: viram para um rato a até `SHOTS.aimAssistDeg` da mira (veja `combat.md`).
8. **"Apertou neste frame"** (pulo, teias, confirmar, pausa, som) é a borda de subida, comparando com o frame anterior.
   - Apertar `RB` com `RT` já seguro (ou o contrário) não dispara outra teia.
   - `navY` dá um passo de menu por empurrão do D-pad ou analógico.
   - O leitor é um só e sobrevive aos reinícios da cena (veja `pause-menu.md`).
9. **Teclado/mouse e controle juntos:** os dois funcionam ao mesmo tempo. O movimento soma e é limitado a `[-1, 1]`; os botões são OU.
10. **Quem manda na mira:** o último dispositivo usado para mirar. Mover o analógico direito ou apertar a teia no controle passa a mira para o controle; mover ou clicar o mouse devolve para o mouse.
11. **Retícula no modo controle:** se a teia alcança algo, a retícula fica branca no ponto de acerto (já com a mira assistida). Se não, fica cinza a `GAMEPAD.reticleDistance` px da aranha, na direção mirada.
12. **Vibração:** quando a teia gruda em algo, o controle dá um tranco curto (`GAMEPAD.rumbleWeb`). Se o navegador ou o controle não suportarem, nada acontece.
13. **Vários controles:** usa o primeiro conectado com mapa `standard`; se nenhum tiver, o primeiro conectado.

## Casos de borda

- **O navegador só "vê" o controle depois de um botão apertado** com a página aberta (regra de privacidade da Gamepad API). Antes disso, `getGamepads()` vem vazio.
- **Som:** o Chrome não conta o controle como gesto do usuário para liberar áudio. Se nada tocar, uma tecla ou clique libera.
- **Controle desconectado no meio do jogo:** o input do controle vira neutro. Se a teia estava sendo segurada pelo controle, a corda solta.
- **8BitDo no modo Switch/Android/D-input:** o mapa pode não ser `standard` e os botões podem trocar de lugar. Use o modo Windows/XInput (no Ultimate 2C com fio, já é o padrão).
