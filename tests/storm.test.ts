import { describe, expect, it } from 'vitest';
import { STORM } from '../src/config';
import { Storm, type ThunderEvent, boltPath, makeRng } from '../src/systems/storm';

const DT = 1 / 60;

/** Roda a tempestade por `seconds` e junta os trovões com o instante em que soaram. */
function simulate(storm: Storm, seconds: number) {
  const thunders: { t: number; e: ThunderEvent }[] = [];
  const flashes: number[] = [];
  for (let i = 0; i < seconds / DT; i++) {
    for (const e of storm.update(DT)) thunders.push({ t: i * DT, e });
    flashes.push(storm.flash);
  }
  return { thunders, flashes };
}

describe('makeRng', () => {
  it('é determinístico e fica em [0, 1)', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('Storm', () => {
  it('o primeiro raio cai dentro da janela configurada', () => {
    const storm = new Storm(1);
    const { flashes } = simulate(storm, STORM.firstStrikeSec[1] + 0.1);
    const first = flashes.findIndex((f) => f > 0) * DT;
    expect(first).toBeGreaterThanOrEqual(STORM.firstStrikeSec[0] - DT);
    expect(first).toBeLessThanOrEqual(STORM.firstStrikeSec[1] + DT);
  });

  it('não troveja toda hora: os raios respeitam o intervalo mínimo', () => {
    const storm = new Storm(7);
    const minutes = 10;
    simulate(storm, minutes * 60);
    const maxStrikes = Math.ceil((minutes * 60) / STORM.gapSec[0]) + 1;
    const minStrikes = Math.floor((minutes * 60 - STORM.firstStrikeSec[1]) / STORM.gapSec[1]);
    expect(storm.strikes).toBeLessThanOrEqual(maxStrikes);
    expect(storm.strikes).toBeGreaterThanOrEqual(minStrikes);
  });

  it('cada raio gera um trovão, depois do clarão', () => {
    const storm = new Storm(3);
    const { thunders } = simulate(storm, 5 * 60);
    expect(thunders.length).toBeGreaterThan(0);
    // Pode haver no máximo um trovão ainda a caminho no fim da simulação.
    expect(storm.strikes - thunders.length).toBeLessThanOrEqual(1);
  });

  it('raio perto: clarão forte, raio visível e trovão logo depois', () => {
    const storm = new Storm(5);
    storm.strike(true);
    storm.update(DT);
    expect(storm.flash).toBeGreaterThan(0.6);
    expect(storm.bolt).not.toBeNull();
    const { thunders } = simulate(storm, STORM.thunderDelayCloseSec[1] + 0.1);
    expect(thunders[0].e.close).toBe(true);
    expect(thunders[0].t).toBeGreaterThanOrEqual(STORM.thunderDelayCloseSec[0] - 2 * DT);
    expect(storm.bolt).toBeNull();
  });

  it('raio longe: clarão fraco, sem raio visível, trovão demora mais', () => {
    const storm = new Storm(9);
    storm.strike(false);
    storm.update(DT);
    expect(storm.flash).toBeLessThan(0.6);
    expect(storm.bolt).toBeNull();
    const { thunders } = simulate(storm, STORM.thunderDelayFarSec[1] + 0.1);
    expect(thunders[0].e.close).toBe(false);
    expect(thunders[0].t).toBeGreaterThanOrEqual(STORM.thunderDelayFarSec[0] - 2 * DT);
  });

  it('o clarão apaga sozinho e nunca passa de 1', () => {
    const storm = new Storm(11);
    storm.strike(true);
    const { flashes } = simulate(storm, 3);
    expect(Math.max(...flashes)).toBeLessThanOrEqual(1);
    expect(flashes[flashes.length - 1]).toBeLessThan(0.01);
  });
});

describe('boltPath', () => {
  it('desce até o comprimento pedido e é igual para a mesma semente', () => {
    const a = boltPath(123, 200);
    expect(a).toEqual(boltPath(123, 200));
    const trunk = a[0];
    expect(trunk[0]).toEqual({ x: 0, y: 0 });
    expect(trunk[trunk.length - 1].y).toBe(200);
    for (let i = 1; i < trunk.length; i++) expect(trunk[i].y).toBeGreaterThan(trunk[i - 1].y);
  });
});
