# Spec: atmosfera (noite chuvosa)

O jogo se passa numa noite de tempestade. Dentro de casa está escuro, iluminado só pelas luminárias. Lá fora chove, e de vez em quando cai um raio: o clarão entra pelas janelas e o trovão vem depois, como em *Gone Home*.

Código:
- `src/systems/storm.ts`: lógica pura. Decide quando cai cada raio, calcula o clarão (0..1) e avisa quando cada trovão deve tocar. Também desenha o caminho do raio.
- `src/art/lighting.ts`: lógica pura. Calcula no boot os mapas de luz, o feixe de cada luminária e a luz do relâmpago.
- `src/art/levelArt.ts`: monta e guarda o cenário, a máscara do lado de fora e a luz, calculados uma vez só.
- `src/entities/Atmosphere.ts`: desenha tudo no Phaser (escuro, feixes, poeira, chuva, clarão e raio).
- `src/audio/StormSounds.ts` (chuva e trovão) e `src/audio/Footsteps.ts` (passos), sintetizados.

Testes: `tests/storm.test.ts` e `tests/lighting.test.ts`.

## Luz

1. **Escuro ambiente:** o cenário é multiplicado pelo mapa de luz (blend MULTIPLY). Onde nenhuma lâmpada alcança, a cor é `PAL.light.ambient`: azulado, escuro, mas **nunca preto**.
2. **Luminárias:** cada decoração `lamp` é uma fonte de luz. A lâmpada fica em `lampBulb()` (decorArt).
   - Cone para baixo com abertura `LIGHT.coneHalfDeg` e borda suave `LIGHT.coneSoftDeg`, alcance `LIGHT.lampRadius`.
   - Um brilho em volta da lâmpada (`LIGHT.glowRadius`) acende a cúpula e o teto perto.
   - **Sombras:** tiles sólidos bloqueiam a luz, então embaixo da mesa e da cama fica escuro. A luz entra `LIGHT.penetration` px no sólido, o que acende o topo dos móveis e do piso.
   - A luz não atravessa pisos: cada cômodo só é iluminado pelas próprias lâmpadas.
3. **Feixe visível:** por cima vai um cone fraco somado (blend ADD), só no ar, e partículas de poeira flutuando dentro dele.
4. **Pixel art:** os degradês são quantizados em `LIGHT.bands` faixas, com pontilhado Bayer 4×4 na passagem entre elas. Nada de degradê liso.
5. **Lado de fora:** céu e vidro das janelas formam a "máscara do lado de fora" (`outside`, gerada pelo baker). Lá a luz vale 1 (não escurece), porque o céu já é pintado escuro na paleta.
6. **A aranha** e a teia ficam acima da camada de escuro e recebem a cor da luz do lugar onde estão, com mínimo `LIGHT.spiderMinLight` para não sumirem.

## Chuva e relâmpagos

1. **Chuva:** `STORM.rainDrops` gotas (riscos de 1 px inclinados pelo vento) caem dentro da área da câmera. Só aparecem nos pixels do lado de fora, ou seja, no céu e através das janelas.
2. **Raios:** o primeiro cai entre `STORM.firstStrikeSec` segundos; depois, um a cada `STORM.gapSec` segundos (24 a 55 s). Trovão é **evento**, não barulho de fundo.
3. **Perto ou longe** (`STORM.closeChance`):
   - perto: clarão forte que pisca 3 vezes, raio visível no céu por `STORM.boltVisibleSec` e trovão alto com estalo depois de 0,15 a 0,6 s;
   - longe: clarão fraco, sem raio visível e um ronco depois de 1 a 2,6 s.
   - Os atrasos são curtos de propósito: com 2,5 a 6 s o jogador não ligava o trovão ao clarão e achava que o raio "não fazia barulho".
4. **Clarão:** a camada de escuro perde `LIGHT.flashBrighten` da força, e a luz do relâmpago (`PAL.light.flash`) entra pelas janelas com sombra dos sólidos. O título da tela inicial também brilha.
5. O raio só é desenhado numa coluna da tela onde dá para ver céu. Num cômodo sem janela à vista, ele não aparece.
6. **Buraco no telhado do sótão:** é céu no mapa, então a chuva e o raio aparecem nele. Metade das gotas também cai para dentro do sótão, numa faixa embaixo do buraco que vai até a poça no chão (`leaks` em `levelArt.ts`). No relâmpago, a luz entra pelo buraco como numa janela. Spec: [street-cutscene.md](street-cutscene.md)

## Som

- **Sem música no jogo.** A música só toca na tela inicial (veja `title-screen.md`).
- **Passos:** a cada pata que toca o chão (quadros `walk0` e `walk2` da animação), um "tic" curtinho com leve variação. Correndo, os passos ficam mais rápidos e um pouco mais fortes.
- **Chuva:** ruído contínuo e abafado por um passa-baixa (a chuva bate lá fora), com volume baixo (`SFX.rainVolume`). Na cutscene da rua, `setOutside(true)` abre o filtro e sobe o volume (`SFX.rainOutsideVolume`).
- **Trovão:** ronco que "rola" por alguns segundos, com duas camadas no mesmo envelope:
  - grave: ruído marrom num passa-baixa;
  - médio: 250 a 900 Hz, que é o que caixinhas de notebook tocam. Sem ela o trovão ficava abaixo de 200 Hz e sumia atrás da chuva.
  - Um saturador suave (tanh) gera harmônicos do grave. Os trovões perto começam com um estalo.
  - Medido acima de 250 Hz, o trovão perto fica cerca de 2,8× mais forte que a chuva, e o longe cerca de 1,9×.
- Tudo passa por um `AudioHub` com um só `AudioContext`, volume geral e limitador. `M` / `Select` deixa tudo mudo.

## Como mexer

- **Nova luminária:** adicione `{ kind: 'lamp', tx, ty }` em `DECORATIONS` (houseMap.ts). A luz, o feixe e a poeira vêm sozinhos.
- **Nova janela:** `window` ou `roundWindow` já marcam o vidro como lado de fora e viram fonte de luz no relâmpago.
- **Mais claro ou mais escuro:** `PAL.light.ambient` em `palette.ts`.
- **Raio na hora (debug):** `__storm.strike(true)` no console (`false` = longe).

## Casos de borda

- **Custo no boot:** os mapas são calculados uma vez (cerca de 0,5 a 1 s), e o teste em `lighting.test.ts` falha se passar de 3 s.
- **Câmera pulando longe** (o Play desce do sótão até a aranha): as gotas que saem da área são espalhadas de novo dentro da tela.
