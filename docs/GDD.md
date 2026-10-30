# GDD: Spider Web

## Conceito

Você é uma pequena aranha numa casa enorme, numa **noite de tempestade**. O jogo é um 2D de exploração sem pressa. A diversão está em **se mover como uma aranha**: grudar em qualquer superfície, correr pelas paredes e atravessar cômodos se balançando nas próprias teias.

O perigo são os **ratos** brancos de olhos vermelhos que vivem em partes da casa: quando veem a aranha, correm atrás e mordem. A aranha tem 3 de vida e se defende com teias: uma que machuca e outra que prende o rato por 5 segundos. Ratos não sobem paredes, então fugir para o alto também funciona.

A casa está escura, iluminada só pelas luminárias. Lá fora chove, e de vez em quando um relâmpago clareia tudo pelas janelas e o trovão vem depois, como em *Gone Home*.

E lá fora há algo pior: pelo buraco no telhado do sótão, a aranha vê a rua do bairro tomada por uma horda de **zumbis**.

Pela casa há **cartas** do pai da família que morava ali. Elas contam o que aconteceu antes da aranha acordar.

O jogo é dividido em **atos**, como os episódios da Telltale. O ato 1 é a casa, e termina quando a aranha sai pelo telhado e vê a horda. O ato 2 é a travessia da rua **por cima**, se balançando pelos postes na ventania, até entrar pela chaminé da casa vizinha.

O jogo é em **inglês** (textos da interface). Código também em inglês; comentários e docs em português.

## Pilares

1. **Grudar em tudo.** Chão, paredes, teto e móveis são caminho. A aranha contorna cantos sem parar.
2. **Movimento fluido.** Andar, correr, pular e balançar devem se encadear sem travar.
3. **Uma casa para explorar.** Cada cômodo tem móveis que viram terreno: embaixo da cama, dentro da banheira, em cima do armário.
4. **Pixel art de noite chuvosa.** Escuro azulado, poças de luz quente das lâmpadas, chuva e relâmpagos. Nunca escuro a ponto de não enxergar.

## Fluxo

1. **Tela inicial:** "SPIDER WEB" e o menu principal por cima do sótão com chuva: **NEW GAME** (jogo novo, pergunta antes de apagar o salvo), **LOAD GAME** (abre a seleção de atos no ato atual), **SCENES** (rever as cutscenes já vistas e o resumo de cada ato terminado, como no museu do *Sonic Generations*; spec: [features/scenes.md](features/scenes.md)) e **ACHIEVEMENTS** (as conquistas de cada ato; spec: [features/achievements.md](features/achievements.md)). A música toca aqui. Spec: [features/title-screen.md](features/title-screen.md)
2. **Seleção de atos:** estilo Telltale: o nome do ato entre setas (`LB`/`RB`), a arte do ato numa moldura gasta e `SELECT`/`BACK`. O ato 2 aparece bloqueado (COMING SOON). Spec: [features/acts.md](features/acts.md)
3. **Cutscene de abertura:** na tela preta, o texto conta que os insetos sempre estiveram aqui e sobreviveram aos predadores gigantes. Uma luz revela a aranha desacordada, de barriga para cima, coberta por um líquido verde mutante. Ela acorda, desvira e sai da escuridão por um buraco de rato. Pode ser pulada. Spec: [features/intro.md](features/intro.md)
4. **Jogo:** a aranha sai do buraco de rato na sala e o controle é liberado. No jogo, só os sons da casa: passos, chuva, trovões e os ratos.
5. **Cartas:** perto de uma folha aparece `READ`; ela abre em tela cheia, segurada pelas patas da aranha, e o jogo pausa. Spec: [features/letters.md](features/letters.md)
6. **Buraco no telhado (fim do ato 1):** passar pelo buraco no telhado do sótão escurece a tela e mostra a **cutscene da rua**: a aranha sai no telhado, a câmera corta para a rua e sobe das pernas até as cabeças de uma horda de zumbis passando na chuva. Pode ser pulada. Spec: [features/street-cutscene.md](features/street-cutscene.md)
7. **Fim do ato:** "END OF ACT 1 / AWAKENING", as cartas achadas (ex.: 2/3) e o próximo ato. Depois, volta para a seleção de atos. O progresso fica salvo no navegador. Spec: [features/acts.md](features/acts.md)
8. **Ato 2, ROOFTOPS** (liberado depois do ato 1): transição de teia e vento; a cutscene continua de onde o ato 1 parou (a aranha na calha, olhando a horda, o vento começando) e devolve o controle ali: o primeiro balanço é do jogador. Na fase, só balanço, ventania e obstáculos; cair na rua é ser pisada por um zumbi e voltar no último checkpoint. Termina entrando pela chaminé. Spec: [features/act2-rooftops.md](features/act2-rooftops.md)
9. **Pausa:** `Esc`/`Start` abre o menu com Resume, Restart e Main Menu. Spec: [features/pause-menu.md](features/pause-menu.md)
10. **Morte:** com a vida zerada a tela escurece e a aranha volta ao início da fase, na frente do buraco (sem tela inicial nem cutscene). Spec: [features/combat.md](features/combat.md)

## História (rascunho)

Os insetos sempre estiveram aqui e sobreviveram a predadores gigantes. A protagonista acorda dentro da parede de uma casa, coberta por um líquido verde **mutante** que pingou de um cano. Ainda vai ser desenvolvida: o que é o líquido, o que ele fez com ela e o que ela busca na casa.

**As cartas do pai** (ato 1):

1. **Dia 14** (mesa da sala): há duas semanas começou a invasão dos "doentes", gente que morre e volta matando. Ele se trancou em casa com a esposa e a filha; a comida está acabando e eles bebem água da chuva. A filha tem asma, e ele vai ter que sair para buscar remédio.
2. **Dia 21** (cama): a comida acabou e eles estão com sede. Ele abriu um buraco no sótão para fugir, mas tem medo do que viu lá em cima. Vão sair pelos telhados, de casa em casa.
3. **Extra** (canto do sótão): ele e a esposa, Jean Marry, estavam perto do divórcio; cuidar da filha e se proteger os uniu mais do que nunca.

O buraco no telhado que a aranha usa para sair é o que o pai abriu. Fica para depois: a família conseguiu fugir? A filha achou o remédio?

Lá fora o mundo acabou: uma horda de zumbis anda pela rua do bairro (americano, de classe média) debaixo da tempestade. Os zumbis misturam o do Minecraft (corpo em blocos, braços esticados) com o de Plants vs. Zombies (roupa do dia a dia, olhos grandes e desiguais, boca aberta). Fica para depois decidir se o líquido mutante tem a ver com isso.

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
| Ler a carta perto | `F` (fecha com `F`, `Esc`, `Enter`, `Espaço` ou clique) | `Y` (fecha com `Y`, `B`, `A` ou `Start`) |
| Menu principal | `↑`/`↓` escolhe, `Enter`/`Espaço` ou clique confirma, `Esc` volta | D-pad/analógico escolhe, `A`/`Start` confirma, `B` volta |
| Seleção de atos | `←`/`→` ou `A`/`D` trocam, `Enter` escolhe, `Esc` volta | `LB`/`RB` ou ←/→ trocam, `A` escolhe, `B` volta |
| Pular a cutscene | `Enter`, `Esc` ou `Espaço` | `A` ou `Start` |
| Pausar | `Esc` ou `P` | `Start` |
| Som liga/desliga | `M` | `Select` |
| Ajuda (painel de controles, começa escondido) | `H` (sempre aparece na pausa) | (aparece na pausa) |
| Debug | `G` | — |

Na parede, apertar *em direção* à parede sobe e apertar *para fora* desce. Ao virar um canto segurando a mesma tecla, a aranha continua andando (veja a spec de movimento). Teclado/mouse e controle funcionam juntos. Spec do controle: [features/gamepad.md](features/gamepad.md)

## Mecânicas (MVP)

- **Andar em superfícies.** Spec: [features/surface-movement.md](features/surface-movement.md)
- **Correr.** `Shift` multiplica a velocidade (andar 70 px/s, correr 150 px/s).
- **Pular.** Impulso para fora da superfície. No ar há gravidade e controle leve; ao encostar em qualquer superfície, a aranha gruda.
- **Teia.** Raio até 240 px (alcança o teto a partir do chão). Se acertar algo, vira um pêndulo; dá para subir até o ponto e grudar lá. Spec: [features/web-swing.md](features/web-swing.md)
- **Cartas.** Três folhas escritas pelo pai (duas da história e uma extra). Spec: [features/letters.md](features/letters.md)
- **Ventania (ato 2).** Como na subida final do Celeste: de tempos em tempos vem uma rajada que empurra a aranha no ar e na teia. Grudada ela não solta, mas parada é arrastada para trás: para ficar no lugar, tem que andar contra o vento. Na rajada voam detritos, e fios soltos dão choque. Spec: [features/wind.md](features/wind.md)
- **Vida e ratos.** 3 corações. Cada mordida tira 1. Ratos patrulham embaixo da mesa da sala, embaixo da mesa da cozinha, em cima da cama e no sótão, e têm 3 de vida. Teia de ataque tira 1; teia que prende os segura por 5 s. Spec: [features/combat.md](features/combat.md)

## Mundo: a casa

Um corte lateral da casa (estilo casa de bonecas), com 80×44 tiles de 16 px:

| Andar | Cômodos | Destaques |
|---|---|---|
| Sótão | Sótão com telhado em escada | Caixas, baú, teias velhas, duas luminárias; alçapão para o quarto; buraco no telhado (chuva entrando, poça embaixo) que leva à cutscene da rua; a carta extra no canto direito |
| Andar de cima | Quarto, Banheiro | Cama (dá para passar embaixo) com a carta do dia 21, armário, prateleira; banheira, vaso, pia |
| Térreo | Sala, Cozinha | Estante, sofá, mesa com cadeiras e a carta do dia 14; balcão, armários suspensos, geladeira |

**Ato 2, a rua:** de lado, por cima dos postes: o telhado da casa do ato 1, poste de luz, poste de madeira com fios, árvore, ponto de ônibus, outdoor ("SUNNY DAYS AHEAD"), semáforo, garagem e a casa vizinha com a chaminé. Lá embaixo a horda passa na calçada.

Os andares da casa se ligam por buracos no piso (banheiro↔cozinha) e pelo alçapão (quarto↔sótão). As portas são vãos nas paredes internas.

## Direção de arte

- Resolução interna de 480×270, escalada em número inteiro, sem filtro.
- Tiles de 16 px; o sprite da aranha tem 22×14 px (pequena num mundo grande).
- O cenário é "assado" numa única textura no boot; os móveis de fundo (maiúsculas no mapa) ficam escurecidos para dar profundidade.
- Sombra suave embaixo e ao lado de superfícies sólidas.
- A teia é desenhada pixel a pixel (linha de Bresenham), sem anti-aliasing.
- **Noite:** o cenário é multiplicado por um mapa de luz: escuro azulado em todo lugar, cones de luz quente embaixo das luminárias (com sombra dos móveis), feixe visível com poeira, chuva no céu e nas janelas, relâmpagos. Degradês em faixas com pontilhado. Spec: [features/atmosphere.md](features/atmosphere.md)

## Som

- **Música:** piano solo, calmo e misterioso: uma valsa lenta em Ré menor, como um tema clássico de filme de Drácula. Gerada por código, em loop de cerca de 1min30. **Toca só na tela inicial.** Spec: [features/music.md](features/music.md)
- **No jogo:** passinhos da aranha, chuva abafada e trovões de vez em quando (24 a 55 s entre raios). Tudo sintetizado. Spec: [features/atmosphere.md](features/atmosphere.md)
- **Combate:** cada dano tem som, como nos mobs do Minecraft: guinchos dos ratos, chiado da aranha, "fiuu" das teias. Spec: [features/combat.md](features/combat.md)
- **Ato 2:** o vento sobe e desce com a rajada (ruído com assobio), choque dos fios, estalinhos das faíscas, a pisada (baque + estalo + respingo) e os gemidos da horda ficando mais altos quanto mais perto da rua. Spec: [features/wind.md](features/wind.md)
- **Transições:** espirro de gosma (ato 1) e assobio de vento com "fiuu" de teia (ato 2). Spec: [features/transitions.md](features/transitions.md)
- **Cutscene da rua:** coro de gemidos sintetizados (cada zumbi geme de tempos em tempos), passos molhados e a chuva de fora, mais alta. Spec: [features/street-cutscene.md](features/street-cutscene.md)

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
- [x] Buraco no telhado e cutscene da rua (horda de zumbis)
- [x] Cartas do pai (mesa, cama, sótão) com a página segurada pelas patas
- [x] Atos: seleção estilo Telltale, fim do ato, progresso salvo
- [x] Ato 2: a travessia pelos postes, com ventania, detritos, fios com faísca, checkpoints e a pisada do zumbi
- [x] Transições: escurecer entre as telas do menu, gosma verde (ato 1), teia e vento (ato 2)
- [x] Menu principal: NEW GAME, LOAD GAME, SCENES e ACHIEVEMENTS
- [x] SCENES: rever as cenas, como no museu do *Sonic Generations*, mais um resumo cinematográfico de cada ato terminado
- [x] ACHIEVEMENTS: quatro conquistas no ato 1 (ler uma carta, ler a carta de amor, sair pelo telhado, matar todos os ratos) e duas no ato 2 (terminar a travessia, ser pisado por um doente), com aviso na tela
- [ ] Ato 3: dentro da casa vizinha (a aranha entrou pela chaminé)
- [ ] Sair de verdade para o telhado ou para a rua (uma fase do lado de fora?)
- [x] Menu de pausa (Resume, Restart, Main Menu)
- [x] Perigo: ratos (vida, mordida, teias de ataque e de prender)
- [ ] Mais perigos: chinelo, aspirador, gato
- [ ] Recuperar vida (comer moscas?)
- [ ] Mapa editável no Tiled, se o ASCII ficar pequeno demais
