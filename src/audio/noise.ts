// Buffers de ruído gerados por código (determinísticos), base da chuva, dos trovões e dos passos.

/** Gerador linear congruente simples: devolve -1..1. */
function lcg(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) | 0;
    return ((s >>> 0) / 4294967295) * 2 - 1;
  };
}

export function whiteNoise(ctx: BaseAudioContext, seconds: number, seed: number, channels = 1): AudioBuffer {
  const buf = ctx.createBuffer(channels, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  for (let ch = 0; ch < channels; ch++) {
    const rand = lcg(seed + ch * 7919);
    const data = buf.getChannelData(ch);
    for (let i = 0; i < data.length; i++) data[i] = rand();
  }
  return buf;
}

/** Ruído marrom (grave, "rolando"): ruído branco integrado, normalizado para pico 1. */
export function brownNoise(ctx: BaseAudioContext, seconds: number, seed: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  const rand = lcg(seed);
  let v = 0;
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    v = (v + rand() * 0.02) * 0.998;
    data[i] = v;
    peak = Math.max(peak, Math.abs(v));
  }
  for (let i = 0; i < data.length; i++) data[i] /= peak || 1;
  return buf;
}

/**
 * Chuva em loop (estéreo): chiado suave + gotas soltas (estalinhos que somem rápido).
 * O começo e o fim se encaixam porque é ruído sem padrão.
 */
export function rainNoise(ctx: BaseAudioContext, seconds: number, seed: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const buf = ctx.createBuffer(2, Math.floor(rate * seconds), rate);
  for (let ch = 0; ch < 2; ch++) {
    const rand = lcg(seed + ch * 104729);
    const data = buf.getChannelData(ch);
    let lp = 0;
    let drop = 0;
    let dropDecay = 0;
    for (let i = 0; i < data.length; i++) {
      const w = rand();
      lp += (w - lp) * 0.3;
      // ~70 gotas por segundo, cada uma um estalinho de alguns milissegundos.
      if (rand() > 1 - (2 * 70) / rate) {
        drop = 0.4 + Math.abs(rand()) * 0.6;
        dropDecay = Math.exp(-1 / (rate * (0.002 + Math.abs(rand()) * 0.006)));
      }
      drop *= dropDecay;
      data[i] = lp * 0.55 + w * drop * 0.8;
    }
  }
  return buf;
}
