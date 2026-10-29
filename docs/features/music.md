# Spec: música de fundo

Código: `src/audio/score.ts` (partitura, lógica pura), `src/audio/PianoSynth.ts` (piano sintetizado), `src/audio/MusicPlayer.ts` (agendador em loop).
Testes: `tests/score.test.ts`.

**Onde toca:** só na tela inicial (`title-screen.md`). Ela continua na seleção de atos e nas telas do menu, e some em `MUSIC.fadeOutSec` quando um ato começa. Durante o jogo não há música, só chuva, trovões e passos (`atmosphere.md`).

## Clima

Piano solo, calmo e misterioso, como um tema clássico de filme de Drácula visto por uma aranha.

- **Tonalidade:** Ré menor, usando a menor harmônica (Dó♯, e o Sol♯ do acorde de Mi7 dão o "ar gótico").
- **Compasso:** valsa lenta 3/4 a 66 BPM, com a mão esquerda em arpejo de colcheias e o pedal segurando o acorde até o fim do compasso.
- **Baixo de lamento:** Ré → Dó♯ → Dó → Si → Si♭ (desce meio tom por compasso).
- **Floreio:** um mordente Lá–Sol♯–Lá no fim da frase A, que lembra a Tocata em Ré menor.

## Forma (loop de cerca de 1min30)

| Parte | Compassos | Observação |
|---|---|---|
| A | 8 | tema principal, região média |
| B | 8 | resposta mais aguda e expressiva |
| A' | 8 | tema uma oitava acima, mais suave |
| B | 8 | volta com intensidade média |
| respiro | 1 | silêncio antes de recomeçar |

## Regras

1. A música é agendada assim que a tela inicial abre, mas os navegadores bloqueiam áudio automático: ela só soa depois da primeira tecla ou clique na página (`AudioHub.unlockOnGesture`). Ela entra com um fade-in.
2. `M` / `Select` liga e desliga todo o som do jogo (fade curto, no `AudioHub`).
3. Humanização: variação determinística de ±8% no volume e de ±8 ms no tempo de cada nota.
4. O agendador programa as notas com `MUSIC.lookahead` segundos de antecedência, para não falhar mesmo com a aba em segundo plano.

## Piano sintetizado

Por nota: duas "cordas" levemente desafinadas (forma de onda harmônica com o 7º harmônico atenuado), um filtro passa-baixa que escurece com o tempo, um envelope com decaimento exponencial (graves soam mais tempo), um "toque do martelo" com ruído curto e um abafador ao soltar. Tudo passa por um reverb de convolução (resposta ao impulso gerada por ruído) e um compressor. O `MusicPlayer` recebe o contexto e o destino de fora (o `AudioHub` do jogo, ou um `OfflineAudioContext` para medir).

## Como editar a partitura

Em `src/audio/score.ts`, cada compasso tem:
- `bass`: nota grave do 1º tempo;
- `chord`: 3 notas do arpejo (padrão: baixo, 1, 2, 3, 2, 1 em colcheias);
- `melody`: lista de `[nota, tempos]`, em que `'-'` é pausa. **A soma dos tempos tem que dar 3** (o teste confere).

As notas são escritas como `'D4'`, `'C#5'` e `'Bb1'`.
