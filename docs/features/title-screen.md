# Spec: tela inicial (menu principal)

Código: `src/scenes/TitleScreen.ts` (o menu e a confirmação do NEW GAME, em HTML), `src/scenes/LockedScreen.ts` (as telas de SCENES e ACHIEVEMENTS, por enquanto trancadas), `src/systems/menu.ts` (andar no menu pulando o que está apagado, lógica pura), os elementos `#title` e `#locked` em `index.html` e os modos `title` e `extras` da `GameScene`.

Testes: `tests/menu.test.ts` e `tests/progress.test.ts`.

## O que aparece

- O nome do jogo, **SPIDER WEB**, segurado por um fio de teia que desce do topo da tela. No clarão do relâmpago, o título brilha junto.
- Embaixo, o menu, um botão por linha: **NEW GAME**, **LOAD GAME**, **SCENES** e **ACHIEVEMENTS**. O jogo é em inglês.
- Atrás, o próprio jogo: a câmera mostra o sótão e o céu (`TITLE.cameraX/Y`) e passeia devagar para os lados. A chuva cai e os relâmpagos acontecem normalmente.
- A **música** (valsa em Ré menor) toca aqui, na seleção de atos e nas telas de SCENES e ACHIEVEMENTS.

## Controles

| | Teclado / mouse | Controle |
|---|---|---|
| Escolher | `↑`/`↓` ou `W`/`S`, ou passar o mouse | D-pad ou analógico ↑/↓ |
| Confirmar | `Enter`, `Espaço` ou clique | `A` ou `Start` |
| Voltar (na confirmação e nas telas trancadas) | `Esc` ou `Backspace` | `B` |

O item selecionado fica preenchido, com a setinha piscando. Item apagado (LOAD GAME sem jogo salvo) é pulado.

## As opções

1. **NEW GAME:** começa um jogo novo do zero.
   - Se já existe progresso salvo (algum ato terminado ou carta achada), pergunta antes: `START A NEW GAME?` / `YOUR SAVED PROGRESS WILL BE LOST.` com `YES` e `NO` (o NO começa selecionado, e `Esc`/`B` é NO).
   - Ao confirmar: o progresso salvo é apagado e trocado por um jogo novo, a música some, a **gosma verde** cobre a tela ([transitions.md](transitions.md)) e começa a cutscene de abertura do ato 1 ([intro.md](intro.md)).
2. **LOAD GAME:** carrega o jogo atual. A tela escurece e clareia na **seleção de atos** ([acts.md](acts.md)), já mostrando o ato mais adiantado que está liberado. Lá o BACK volta para cá.
   - Fica apagado se o navegador não tem nenhum jogo salvo (nunca começou um NEW GAME nem terminou um ato).
3. **SCENES:** a tela escurece e abre a tela de cenas, toda trancada: seis quadros de filme com cadeado e `???`, e o aviso `LOCKED`. Vai virar algo como o museu do *Sonic Generations* (rever cenas). Por enquanto só dá para voltar.
4. **ACHIEVEMENTS:** igual, com oito conquistas trancadas (cadeado, `???` e `LOCKED`). Só dá para voltar.
5. O item selecionado ao abrir: LOAD GAME se existe jogo salvo, senão NEW GAME.

## Regras

1. **Voltar ao menu:** "Main Menu" no menu de pausa reinicia a cena com o menu, e a música recomeça (veja `pause-menu.md`). Depois de morrer ou de "Restart", o menu e a cutscene são pulados. Depois do fim de um ato, o jogo volta direto para a seleção de atos.
2. **Uma coisa de cada vez:** durante uma transição, o menu ignora outro clique ou tecla (a trava `fading` da `GameScene`).
3. **A tecla não "vaza":** o `Enter` que escolhe uma opção não chega na tela que abre (`stopImmediatePropagation`), senão a seleção de atos já escolheria o ato.
4. **Sem pulo acidental:** por `TITLE.inputGraceSec` depois de começar (e ao fechar uma carta), pulo, teias e leitura são ignorados. Assim o `Espaço` ou `A` usado no menu não vira pulo.
5. Na tela inicial a aranha não recebe input, e a mira e os corações ficam escondidos. Os ratos já patrulham atrás do título.
6. `M` / `Select` deixa tudo mudo, também no menu.

## Casos de borda

- **CSS:** o "escondido" do título precisa ser `#title.hidden` e não só `.hidden`, porque `#title { display: flex }` ganha de uma classe sozinha. Um bug antigo vinha disso: o título voltava por cima do jogo depois de morrer.
- **NEW GAME direto do menu:** o menu continua embaixo da gosma e só é escondido quando a transição termina (antes da cutscene começar).
- **Áudio bloqueado:** o navegador só libera o som depois de um clique ou tecla na página. Se o jogo abrir sem nenhum gesto, a música começa no primeiro clique ou tecla. O controle não conta como gesto no Chrome.
- **`localStorage` bloqueado** (aba anônima, por exemplo): LOAD GAME fica apagado e NEW GAME funciona normalmente, só não salva.
- **Aba em segundo plano:** o Phaser pausa a animação e a cena só termina de iniciar quando a aba fica visível.
