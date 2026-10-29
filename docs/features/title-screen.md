# Spec: tela inicial

Código: `src/scenes/TitleScreen.ts` (controlador do HTML), o elemento `#title` em `index.html` e o modo `title` da `GameScene`.
Depois do PLAY vem a seleção de atos: [acts.md](acts.md).

## O que aparece

- Só o nome do jogo, **SPIDER WEB**, e o botão **PLAY**. O jogo é em inglês.
- Atrás, o próprio jogo: a câmera mostra o sótão e o céu (`TITLE.cameraX/Y`) e passeia devagar para os lados. A chuva cai e os relâmpagos acontecem normalmente.
- Um fio de teia desce do topo da tela e "segura" o título. No clarão do relâmpago, o título brilha junto.
- A **música** (valsa em Ré menor) toca só aqui.

## Regras

1. **Começar:** clicar em PLAY, ou `Enter`/`Espaço`, ou `A`/`Start` no controle. A tela escurece devagar e clareia já na **seleção de atos** ([acts.md](acts.md), [transitions.md](transitions.md)), com a música ainda tocando. `Esc`/`B` lá volta para cá do mesmo jeito.
   - O `Enter` do PLAY não chega na seleção de atos (`stopImmediatePropagation`), senão ele já escolheria o ato 1.
2. **Ao escolher o ato 1:**
   - a música some em `MUSIC.fadeOutSec`;
   - a gosma verde cobre a tela ([transitions.md](transitions.md)) e começa a **cutscene de abertura** ([intro.md](intro.md));
   - quando ela termina (ou é pulada), a aranha sai do buraco de rato na sala e aparecem os corações e o painel de ajuda (se o jogador não o escondeu com `H`).
3. **Voltar:** "Main Menu" no menu de pausa reinicia a cena com a tela inicial, e a música recomeça (veja `pause-menu.md`). Depois de morrer ou de "Restart", a tela inicial e a cutscene são puladas. Depois do fim do ato, o jogo volta direto para a seleção de atos.
4. **Sem pulo acidental:** por `TITLE.inputGraceSec` depois do Play (e ao fechar uma carta), pulo, teias e leitura são ignorados. Assim o `Espaço` ou `A` usado para começar não vira pulo.
5. Na tela inicial a aranha não recebe input, e a mira e os corações ficam escondidos. Os ratos já patrulham atrás do título.
6. `M` / `Select` deixa tudo mudo, também na tela inicial.

## Casos de borda

- **CSS:** o "escondido" do título precisa ser `#title.hidden` e não só `.hidden`, porque `#title { display: flex }` ganha de uma classe sozinha. Um bug antigo vinha disso: o título voltava por cima do jogo depois de morrer.

- **Áudio bloqueado:** o navegador só libera o som depois de um clique ou tecla na página. Se o jogo abrir sem nenhum gesto, a música começa no primeiro clique ou tecla. Se esse primeiro gesto já for o PLAY, a música nem chega a tocar. O controle não conta como gesto no Chrome.
- **Aba em segundo plano:** o Phaser pausa a animação e a cena só termina de iniciar quando a aba fica visível.
