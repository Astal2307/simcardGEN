import { describe, expect, it } from 'vitest';
import { activeGuarantees, START_BALANCE, UPGRADES, type Rarity } from '@simrush/shared';
import type { DomainError } from '../src/domain/errors';
import { pickRarity } from '../src/domain/generator';
import { weightsFromTier } from '../src/services/spin';
import { setup } from './helpers';

const code = (fn: () => unknown) => {
  try { fn(); } catch (e) { return (e as DomainError).code; }
  return 'OK';
};

/** rng = 0: без гарантии каждая крутка — common. */
function player() {
  const t = setup({ rng: () => 0 });
  const u = t.app.account.register().user;
  const fund = (amount: number) => { for (let i = 0; i < Math.ceil(amount / 5000); i++) t.app.account.topUp(u.id); };
  const spins = (n: number): Rarity[] => Array.from({ length: n }, () => t.app.spin.spin(u.id).sim.rarity);
  return { ...t, u, fund, spins };
}

describe('гарантии', () => {
  it('база: каждая 10-я крутка ≥ необычный', () => {
    const { spins } = player();
    const r = spins(10);
    expect(r.slice(0, 9).every(x => x === 'common')).toBe(true);
    expect(r[9]).toBe('uncommon');
  });

  it('счётчик возвращается в ответе спина', () => {
    const { app, u } = player();
    app.spin.spin(u.id);
    const res = app.spin.spin(u.id);
    expect(res.pity).toEqual([{ tier: 2, count: 2, period: 10 }]);
  });

  it('апгрейды периода: 9 → 8 → 7', () => {
    const { app, u, fund, spins } = player();
    fund(100_000);
    app.upgrades.buy(u.id, 'p9');
    expect(spins(9)[8]).toBe('uncommon');
    app.upgrades.buy(u.id, 'p8');
    app.upgrades.buy(u.id, 'p7');
    const r = spins(14);
    expect(r.map((x, i) => (x !== 'common' ? i + 1 : 0)).filter(Boolean)).toEqual([7, 14]);
  });

  it('порог тира 3: каждая 50-я ≥ редкий', () => {
    const { app, u, fund, spins } = player();
    fund(60_000);
    app.upgrades.buy(u.id, 't3');
    const r = spins(50);
    expect(r[49]).toBe('rare');
    expect(r.filter(x => x === 'uncommon')).toHaveLength(4); // 10, 20, 30, 40
  });

  it('гарантия не занижает выпавшую редкость и сохраняет пропорции', () => {
    expect(pickRarity(() => 0.9999, weightsFromTier(2))).toBe('legendary');
    expect(weightsFromTier(4)).toMatchObject({ common: 0, uncommon: 0, rare: 0, epic: 2.5, legendary: 0.5 });
  });
});

describe('покупка апгрейдов', () => {
  it('списывает цену и проверяет порядок', () => {
    const { app, u, fund } = player();
    expect(code(() => app.upgrades.buy(u.id, 'p8'))).toBe('UPGRADE_LOCKED');
    expect(code(() => app.upgrades.buy(u.id, 't5'))).toBe('UPGRADE_LOCKED');
    expect(code(() => app.upgrades.buy(u.id, 'nope'))).toBe('NOT_FOUND');

    const res = app.upgrades.buy(u.id, 'p9');
    expect(res.balance).toBe(START_BALANCE - UPGRADES.p9.cost);
    expect(res.upgrades.owned).toEqual(['p9']);
    expect(code(() => app.upgrades.buy(u.id, 'p9'))).toBe('UPGRADE_OWNED');

    expect(code(() => app.upgrades.buy(u.id, 'p8'))).toBe('INSUFFICIENT_FUNDS');
    fund(UPGRADES.p8.cost);
    expect(code(() => app.upgrades.buy(u.id, 'p8'))).toBe('OK');
  });

  it('действующие гарантии — лучший период на тир', () => {
    expect(activeGuarantees([])).toEqual([{ tier: 2, period: 10 }]);
    expect(activeGuarantees(['p9', 'p8', 't3'])).toEqual([{ tier: 2, period: 8 }, { tier: 3, period: 50 }]);
  });
});
