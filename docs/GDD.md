# GDD: Spider Web

## Conceito

Você é uma pequena aranha numa casa enorme, numa **noite de tempestade**. O jogo é um 2D de exploração sem pressa. A diversão está em **se mover como uma aranha**: grudar em qualquer superfície, correr pelas paredes e atravessar cômodos se balançando nas próprias teias.

O perigo são os **ratos** brancos de olhos vermelhos que vivem em partes da casa: quando veem a aranha, correm atrás e mordem. A aranha tem 3 de vida e se defende com teias: uma que machuca e outra que prende o rato por 5 segundos. Ratos não sobem paredes, então fugir para o alto também funciona.

A casa está escura, iluminada só pelas luminárias. Lá fora chove, e de vez em quando um relâmpago clareia tudo pelas janelas e o trovão vem depois, como em *Gone Home*.

O jogo é em **inglês** (textos da interface). Código também em inglês; comentários e docs em português.

## Pilares

1. **Grudar em tudo.** Chão, paredes, teto e móveis são caminho. A aranha contorna cantos sem parar.
2. **Movimento fluido.** Andar, correr, pular e balançar devem se encadear sem travar.
3. **Uma casa para explorar.** Cada cômodo tem móveis que viram terreno: embaixo da cama, dentro da banheira, em cima do armário.
4. **Pixel art de noite chuvosa.** Escuro azulado, poças de luz quente das lâmpadas, chuva e relâmpagos. Nunca escuro a ponto de não enxergar.

## Fluxo

1. **Tela inicial:** só "SPIDER WEB" e o botão PLAY, por cima do sótão com chuva. A música toca aqui. Spec: [features/title-screen.md](features/title-screen.md)
2. **Cutscene de abertura:** na tela preta, o texto conta que os insetos sempre estiveram aqui e sobreviveram aos predadores gigantes. Uma luz revela a aranha desacordada, de barriga para cima, coberta por um líquido verde mutante. Ela acorda, desvira e sai da escuridão por um buraco de rato. Pode ser pulada. Spec: [features/intro.md](features/intro.md)
3. **Jogo:** a aranha sai do buraco de rato na sala e o controle é liberado. No jogo, só os sons da casa: passos, chuva, trovões e os ratos.
4. **Pausa:** `Esc`/`Start` abre o menu com Resume, Restart e Main Menu. Spec: [features/pause-menu.md](features/pause-menu.md)
5. **Morte:** com a vida zerada a tela escurece e a aranha volta ao início da fase, na frente do buraco (sem tela inicial nem cutscene). Spec: [features/combat.md](features/combat.md)

## História (rascunho)

Os insetos sempre estiveram aqui e sobreviveram a predadores gigantes. A protagonista acorda dentro da parede de uma casa, coberta por um líquido verde **mutante** que pingou de um cano. Ainda vai ser desenvolvida: o que é o líquido, o que ele fez com ela e o que ela busca na casa.

## Controles

| Ação | Teclado / mouse | Controle (layout Xbox) |
|---|---|---|
| Andar | `A`/`D` ou `←`/`→` no chão e no teto; `W`/`S` ou `↑`/`↓` nas paredes | Analógico esquerdo ou D-pad |
| Correr | Segurar `Shift` | Segurar `LT` ou `LB` |
| Pular / soltar da superfície | `Espaço` (pula na direção oposta à superfície) | `A` |
| Mirar | Cursor do mouse | Analógico direito |
| Teia de balanço | Segurar o **botão esquerdo do mouse** | Segurar `RB` ou `RT` |
| Subir / descer na teia | `W` / `S` enquanto pendurada | Analógico esquerdo ↑/↓ |
| Balançar | `A` / `D` enquanto pendurada | Analógico esquerdo ←/→ |
| Soltar a teia | Soltar o botão do mouse (mantém o embalo) | Soltar o botão |
| Teia de ataque (tira vida) | Botão direito do mouse | `X` |
| Teia que prende (5 s) | `E` | `B` |
| Começar (tela inicial) | Clique em PLAY, `Enter` ou `Espaço` | `A` ou `Start` |
| Pular a cutscene | `Enter`, `Esc` ou `Espaço` | `A` ou `Start` |
| Pausar | `Esc` ou `P` | `Start` |
| Som liga/desliga | `M` | `Select` |
| Ajuda | `H` | (aparece na pausa) |
| Debug | `G` | — |

Na parede, apertar *em direção* à parede sobe e apertar *para fora* desce. Ao virar um canto segurando a mesma tecla, a aranha continua andando (veja a spec de movimento). Teclado/mouse e controle funcionam juntos. Spec do controle: [features/gamepad.md](features/gamepad.md)

## Mecânicas (MVP)

- **Andar em superfícies.** Spec: [features/surface-movement.md](features/surface-movement.md)
- **Correr.** `Shift` multiplica a velocidade (andar 70 px/s, correr 150 px/s).
- **Pular.** Impulso para fora da superfície. No ar há gravidade e controle leve; ao encostar em qualquer superfície, a aranha gruda.
- **Teia.** Raio até 240 px (alcança o teto a partir do chão). Se acertar algo, vira um pêndulo; dá para subir até o ponto e grudar lá. Spec: [features/web-swing.md](features/web-swing.md)
- **Vida e ratos.** 3 corações. Cada mordida tira 1. Ratos patrulham embaixo da mesa da sala, embaixo da mesa da cozinha, em cima da cama e no sótão, e têm 3 de vida. Teia de ataque tira 1; teia que prende os segura por 5 s. Spec: [features/combat.md](features/combat.md)

## Mundo: a casa

Um corte lateral da casa (estilo casa de bonecas), com 80×44 tiles de 16 px:

| Andar | Cômodos | Destaques |
|---|---|---|
| Sótão | Sótão com telhado em escada | Caixas, baú, teias velhas, duas luminárias; alçapão para o quarto |
| Andar de cima | Quarto, Banheiro | Cama (dá para passar embaixo), armário, prateleira; banheira, vaso, pia |
| Térreo | Sala, Cozinha | Estante, sofá, mesa com cadeiras; balcão, armários suspensos, geladeira |

Os andares se ligam por buracos no piso (banheiro↔cozinha) e pelo alçapão (quarto↔sótão). As portas são vãos nas paredes internas.

## Direção de arte

- Resolução interna de 480×270, escalada em número inteiro, sem filtro.
- Tiles de 16 px; a aranha tem cerca de 20×12 px (pequena num mundo grande).
- O cenário é "assado" numa única textura no boot; os móveis de fundo (maiúsculas no mapa) ficam escurecidos para dar profundidade.
- Sombra suave embaixo e ao lado de superfícies sólidas.
- A teia é desenhada pixel a pixel (linha de Bresenham), sem anti-aliasing.
- **Noite:** o cenário é multiplicado por um mapa de luz: escuro azulado em todo lugar, cones de luz quente embaixo das luminárias (com sombra dos móveis), feixe visível com poeira, chuva no céu e nas janelas, relâmpagos. Degradês em faixas com pontilhado. Spec: [features/atmosphere.md](features/atmosphere.md)

## Som

- **Música:** piano solo, calmo e misterioso: uma valsa lenta em Ré menor, como um tema clássico de filme de Drácula. Gerada por código, em loop de cerca de 1min30. **Toca só na tela inicial.** Spec: [features/music.md](features/music.md)
- **No jogo:** passinhos da aranha, chuva abafada e trovões de vez em quando (24 a 55 s entre raios). Tudo sintetizado. Spec: [features/atmosphere.md](features/atmosphere.md)
- **Combate:** cada dano tem som, como nos mobs do Minecraft: guinchos dos ratos, chiado da aranha, "fiuu" das teias. Spec: [features/combat.md](features/combat.md)

## Câmera

Segue a aranha com suavização, presa aos limites do mapa. Na tela inicial, mostra o sótão e passeia devagar; ao começar, desce até a aranha.

## Backlog (pós-MVP)

- [ ] Moscas e mosquitos para caçar (coletáveis) e um contador
- [ ] Descer de rapel a partir do teto (fio vertical)
- [ ] Teias permanentes: pontes e redes que ficam no cenário
- [x] Música (piano gótico em loop), hoje só na tela inicial
- [x] Suporte a controle (gamepad), com vibração quando a teia gruda
- [x] Noite chuvosa: luz das luminárias, chuva, relâmpagos e trovões
- [x] Efeitos sonoros: passos, chuva, trovões, disparo de teia, guinchos e chiados de dano
- [ ] Efeitos sonoros: pouso, rangidos da casa
- [ ] Luminárias piscando quando cai um raio perto
- [x] Tela inicial (HTML/CSS por cima do canvas)
- [x] Cutscene de abertura (texto, despertar no líquido mutante, saída pelo buraco de rato)
- [ ] Desenvolver a história do líquido mutante (mais cutscenes?)
- [x] Menu de pausa (Resume, Restart, Main Menu)
- [x] Perigo: ratos (vida, mordida, teias de ataque e de prender)
- [ ] Mais perigos: chinelo, aspirador, gato
- [ ] Recuperar vida (comer moscas?)
- [ ] Mapa editável no Tiled, se o ASCII ficar pequeno demais
