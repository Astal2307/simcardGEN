import { describe, expect, it } from 'vitest';
import { ALBUM_BY_ID, ALBUMS, albumMatches, START_BALANCE } from '@simrush/shared';
import type { DomainError } from '../src/domain/errors';
import { setup } from './helpers';

const d = (s: string) => s.split('').map(Number);
const hits = (s: string) => albumMatches(d(s)).map(h => `${h.collection}:${h.slot}`).sort();

describe('признаки коллекций', () => {
  it('номер из примеров попадает в нужные ячейки', () => {
    expect(hits('9777777777')).toEqual(['codes:977', 'mirrors:7', 'monolith:7', 'pairs:7', 'tone:7', 'triples:7'].sort());
    expect(hits('9341234567')).toEqual(['ladders:u1']);
    expect(hits('9347654321')).toEqual(['ladders:d7']);
    expect(hits('9331001001')).toEqual(['dates:1', 'mirrors:1', 'twodigit:0']); // ещё и палиндром, и дата 10-01
    expect(hits('9331230321')).toContain('mirrors:0');
    expect(hits('9349121212')).toContain('blocks:1');
    expect(hits('9341231000')).toContain('round:1');
    expect(hits('9341231503')).toContain('dates:3');
    expect(hits('9341233002')).not.toContain('dates:2'); // 30 февраля
    expect(hits('9341123581')).toContain('math:fib');
    expect(hits('9340001024')).toEqual(expect.arrayContaining(['math:sq', 'math:pow2']));
    expect(hits('9341000003')).toContain('math:prime');
    expect(hits('9342221337')).toContain('refs:1337');
    expect(hits('9341234228')).toContain('refs:228');
    expect(hits('9341314159')).toContain('refs:314159');
    expect(hits('9342220451')).toContain('refs:0451');
    expect(hits('9344815162')).toContain('refs:4815');
    expect(hits('9341114815')).not.toContain('refs:4815'); // 4815 — только в начале хвоста
  });

  it('ключи ячеек уникальны внутри коллекции', () => {
    for (const a of ALBUMS) expect(new Set(a.slots.map(s => s.key)).size).toBe(a.slots.length);
  });
});

describe('заполнение коллекций', () => {
  it('спин возвращает новые ячейки, повтор ничего не даёт', () => {
    const { app } = setup();
    const u = app.account.register().user;
    const first = app.spin.spin(u.id, 'legendary');
    expect(first.album.length).toBeGreaterThan(0);
    for (const h of first.album) {
      expect(h.filled).toBe(app.album.state(u.id).filled.filter(f => f.collection === h.collection).length);
      expect(h.total).toBe(ALBUMS.find(a => a.id === h.collection)!.slots.length);
    }
    // тот же rng — тот же номер, ячейки уже закрыты
    expect(app.spin.spin(u.id, 'legendary').album).toEqual([]);
  });

  it('выигранный на аукционе номер тоже засчитывается', () => {
    const { app, advance } = setup();
    app.market.ensureMarketLots();
    const u = app.account.register().user;
    const lot = app.market.snapshot().lots[0];
    app.market.bid(u.id, lot.id);
    advance(lot.endsAt - 1_000_000 + 10_000);
    app.market.tick();
    const expected = albumMatches(lot.sim.digits).length;
    expect(app.album.state(u.id).filled).toHaveLength(expected);
  });
});

describe('награды за коллекции', () => {
  const code = (fn: () => unknown) => {
    try { fn(); } catch (e) { return (e as DomainError).code; }
    return 'OK';
  };

  it('выдаётся один раз и только за собранную коллекцию', () => {
    const { app } = setup();
    const u = app.account.register().user;
    const give = (s: string) => app.album.register(u.id, { id: 'sim-' + s, digits: d(s) });

    give('9341230000');
    give('9341231000');
    expect(code(() => app.album.claim(u.id, 'round'))).toBe('ALBUM_NOT_COMPLETE');

    const last = give('9341235000');
    expect(last.find(h => h.collection === 'round')).toMatchObject({ filled: 3, total: 3 });

    const res = app.album.claim(u.id, 'round');
    expect(res.reward).toBe(ALBUM_BY_ID.round.reward);
    expect(res.balance).toBe(START_BALANCE + ALBUM_BY_ID.round.reward);
    expect(app.album.state(u.id).claimed).toEqual(['round']);
    expect(code(() => app.album.claim(u.id, 'round'))).toBe('ALBUM_CLAIMED');
    expect(code(() => app.album.claim(u.id, 'nope'))).toBe('NOT_FOUND');
  });

  it('у каждой коллекции есть награда', () => {
    for (const a of ALBUMS) expect(a.reward).toBeGreaterThan(0);
  });
});
