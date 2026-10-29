# Spec: menu de pausa

Código: `src/scenes/PauseMenu.ts` (controlador do HTML), o elemento `#pause` em `index.html` e o modo `paused` da `GameScene` e da `RooftopScene` (ato 2).

## Abrir e fechar

| | Teclado / mouse | Controle |
|---|---|---|
| Pausar / voltar | `Esc` ou `P` | `Start` |
| Escolher | `↑`/`↓` ou `W`/`S`, ou passar o mouse | D-pad ou analógico esquerdo ↑/↓ |
| Confirmar | `Enter`, `Espaço` ou clique | `A` |
| Voltar ao jogo | `Esc`/`P` de novo | `B` ou `Start` |

Só dá para pausar durante o jogo: não na tela inicial, na seleção de atos, enquanto a tela escurece (morte, buraco do telhado) nem no fim do ato. Com uma carta aberta, `Esc` fecha a carta em vez de pausar.

## Opções

1. **RESUME:** volta ao jogo. Pulo e teias ficam ignorados por `TITLE.inputGraceSec`, para a tecla do menu não virar ação.
2. **RESTART:** reinicia direto na jogatina (sem cutscene), com vida cheia, ratos de volta e a aranha no começo. As cartas já lidas continuam lidas.
   - No ato 2, volta para o começo do ato 2 (checkpoint 0), sem a cutscene de abertura.
3. **MAIN MENU:** volta para a tela inicial, e a música recomeça. O LOAD GAME de lá leva à seleção de atos, e o ato 1 mostra a cutscene de novo (dá para pular).

## Durante a pausa

- O jogo para: aranha, ratos, teias, chuva, raios e animações. A poeira dos feixes congela no ar.
- O painel de controles aparece, mesmo que o jogador tenha escondido com `H`. Ao voltar, vale a escolha dele.
- A chuva continua soando. `M` / `Select` ainda deixa tudo mudo.

## Detalhes de implementação

- Reiniciar é `scene.restart({ skipTitle })`. O som (`src/audio/sound.ts`) e o leitor do controle (`PlayerInput.ts`) são criados uma vez e sobrevivem ao reinício. Assim a chuva não corta, o mudo continua, e um botão que ainda está apertado (o `A` que escolheu "Main Menu") não vira um "apertou agora" na cena nova.
- A tela inicial e o menu usam `AbortController` para tirar os ouvintes do HTML quando a cena reinicia, porque os elementos são os mesmos.
