import { it } from 'vitest';
import { SPIDER, TILE } from '../../src/config';
import { HOUSE_MAP } from '../../src/level/houseMap';
import { isSolidChar } from '../../src/level/legend';
import { LevelGrid } from '../../src/physics/LevelGrid';
import { SpiderMotor } from '../../src/systems/SpiderMotor';
import { type RecapShot, RecapDirector, recapView, shotStart } from '../../src/systems/recap';

const DT = 1 / 60;
const T = 16;
function trace(shot: RecapShot) {
  const grid = LevelGrid.fromAscii(HOUSE_MAP, TILE, isSolidChar);
  const m = new SpiderMotor(grid, 0, 0);
  const d = new RecapDirector([shot]);
  const out: string[] = [];
  for (let i = 0; i < 60 * 10 && !d.done; i++) {
    const { input, events } = d.step(DT, recapView(m, []));
    for (const e of events) if (e.type === 'shot') { const p = shotStart(shot, TILE, SPIDER.half); m.placeAt(p.x, p.y); }
    m.update(DT, input);
    if (i % 6 === 0) out.push(`${(i * DT).toFixed(1)} a${d.action} (${m.body.x.toFixed(0)},${m.body.y.toFixed(0)}) ${m.surface}${m.rope ? ' R' + m.rope.length.toFixed(0) : ''}`);
  }
  console.log(shot.name, 'timeouts', d.timeouts.join(','), '\n' + out.join(' | '));
}
it('explore', () => {
  for (const [ax, reel, rel] of [[14, 0, 16], [14, 0, 17], [14, 0, 18], [16, -0.3, 20], [16, -0.3, 22], [18, -0.5, 22], [18, -0.5, 24], [18, -0.4, 25], [17, -0.4, 23]]) {
    trace({ name: 'a'+ax+' r'+reel+' x'+rel, start: { tx: 5, ty: 30 }, zoom: 1, holdSec: 0, actions: [
      { type: 'web', anchor: { x: ax * T, y: 29 * T - 1 }, move: { x: 1, y: reel }, until: { minX: rel * T }, maxSec: 4 },
      { type: 'move', move: { x: 1, y: 0 }, until: { attached: true }, maxSec: 3 },
    ] });
  }
});
