# Spec: tela inicial

Código: `src/scenes/TitleScreen.ts` (controlador do HTML), o elemento `#title` em `index.html` e o modo `title` da `GameScene`.

## O que aparece

- Só o nome do jogo, **SPIDER WEB**, e o botão **PLAY**. O jogo é em inglês.
- Atrás, o próprio jogo: a câmera mostra o sótão e o céu (`TITLE.cameraX/Y`) e passeia devagar para os lados. A chuva cai e os relâmpagos acontecem normalmente.
- Um fio de teia desce do topo da tela e "segura" o título. No clarão do relâmpago, o título brilha junto.
- A **música** (valsa em Ré menor) toca só aqui.

## Regras

1. **Começar:** clicar em PLAY, ou `Enter`/`Espaço`, ou `A`/`Start` no controle. Vale só uma vez.
2. **Ao começar:**
   - a tela some com fade;
   - a música some em `MUSIC.fadeOutSec`;
   - a câmera desce até a aranha mais devagar que o normal (`TITLE.introLerp` por `TITLE.introSec`);
   - o painel de ajuda aparece (`H` / `Start` esconde).
3. **Sem pulo acidental:** por `TITLE.inputGraceSec` depois do Play, pulo e teia são ignorados. Assim o `Espaço` ou `A` usado para começar não vira pulo.
4. Na tela inicial a aranha não recebe input e a mira fica escondida.
5. `M` / `Select` deixa tudo mudo, também na tela inicial.

## Casos de borda

- **Áudio bloqueado:** o navegador só libera o som depois de um clique ou tecla na página. Se o jogo abrir sem nenhum gesto, a música começa no primeiro clique ou tecla. Se esse primeiro gesto já for o PLAY, a música nem chega a tocar. O controle não conta como gesto no Chrome.
- **Aba em segundo plano:** o Phaser pausa a animação e a cena só termina de iniciar quando a aba fica visível.
