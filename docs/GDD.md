# GDD: Spider Simulator

## Conceito

Você é uma pequena aranha numa casa enorme. O jogo é um *walkthrough* 2D de exploração: não há pressa nem morte (por enquanto). A diversão está em **se mover como uma aranha**: grudar em qualquer superfície, correr pelas paredes e atravessar cômodos se balançando nas próprias teias.

## Pilares

1. **Grudar em tudo.** Chão, paredes, teto e móveis são caminho. A aranha contorna cantos sem parar.
2. **Movimento fluido.** Andar, correr, pular e balançar devem se encadear sem travar.
3. **Uma casa para explorar.** Cada cômodo tem móveis que viram terreno: embaixo da cama, dentro da banheira, em cima do armário.
4. **Pixel art aconchegante.** Cores quentes, luz de casa, detalhes pequenos.

## Controles

| Ação | Teclado / mouse |
|---|---|
| Andar | `A`/`D` ou `←`/`→` no chão e no teto; `W`/`S` ou `↑`/`↓` nas paredes |
| Correr | Segurar `Shift` |
| Pular / soltar da superfície | `Espaço` (pula na direção oposta à superfície) |
| Atirar teia | Segurar o **botão esquerdo do mouse** mirando com o cursor |
| Subir / descer na teia | `W` / `S` enquanto pendurada |
| Balançar | `A` / `D` enquanto pendurada |
| Soltar a teia | Soltar o botão do mouse (mantém o embalo) |
| Ligar/desligar música | `M` |
| Debug | `G` |

Na parede, apertar *em direção* à parede sobe e apertar *para fora* desce. Ao virar um canto segurando a mesma tecla, a aranha continua andando (veja a spec de movimento).

## Mecânicas (MVP)

- **Andar em superfícies.** Spec: [features/surface-movement.md](features/surface-movement.md)
- **Correr.** `Shift` multiplica a velocidade (andar 70 px/s, correr 150 px/s).
- **Pular.** Impulso para fora da superfície. No ar há gravidade e controle leve; ao encostar em qualquer superfície, a aranha gruda.
- **Teia.** Raio até 240 px (alcança o teto a partir do chão). Se acertar algo, vira um pêndulo; dá para subir até o ponto e grudar lá. Spec: [features/web-swing.md](features/web-swing.md)

## Mundo: a casa

Um corte lateral da casa (estilo casa de bonecas), com 80×44 tiles de 16 px:

| Andar | Cômodos | Destaques |
|---|---|---|
| Sótão | Sótão com telhado em escada | Caixas, baú, teias velhas; alçapão para o quarto |
| Andar de cima | Quarto, Banheiro | Cama (dá para passar embaixo), armário, prateleira; banheira, vaso, pia |
| Térreo | Sala, Cozinha | Estante, sofá, mesa com cadeiras; balcão, armários suspensos, geladeira |

Os andares se ligam por buracos no piso (banheiro↔cozinha) e pelo alçapão (quarto↔sótão). As portas são vãos nas paredes internas.

## Direção de arte

- Resolução interna de 480×270, escalada em número inteiro, sem filtro.
- Tiles de 16 px; a aranha tem cerca de 20×12 px (pequena num mundo grande).
- O cenário é "assado" numa única textura no boot; os móveis de fundo (maiúsculas no mapa) ficam escurecidos para dar profundidade.
- Sombra suave embaixo e ao lado de superfícies sólidas.
- A teia é desenhada pixel a pixel (linha de Bresenham), sem anti-aliasing.

## Música

Piano solo, calmo e misterioso: uma valsa lenta em Ré menor, como um tema clássico de filme de Drácula. É gerada por código e fica em loop de cerca de 1min30. Spec: [features/music.md](features/music.md)

## Câmera

Segue a aranha com suavização, presa aos limites do mapa.

## Backlog (pós-MVP)

- [ ] Moscas e mosquitos para caçar (coletáveis) e um contador
- [ ] Descer de rapel a partir do teto (fio vertical)
- [ ] Teias permanentes: pontes e redes que ficam no cenário
- [x] Música de fundo (piano gótico em loop)
- [ ] Efeitos sonoros: passos, disparo de teia, ambiente da casa
- [ ] Uma música diferente por andar (sótão mais sombrio?)
- [ ] Perigos: chinelo, aspirador, gato
- [ ] Ciclo dia/noite pela janela
- [ ] Menu inicial e tela de pausa (HTML/CSS por cima do canvas)
- [ ] Mapa editável no Tiled, se o ASCII ficar pequeno demais
