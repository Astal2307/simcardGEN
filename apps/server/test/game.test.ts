import { describe, expect, it } from 'vitest';
import { instantSellPrice, SPIN_COST, START_BALANCE, USER_LOT_DURATION_S } from '@simrush/shared';
import { DomainError } from '../src/domain/errors';
import { setup } from './helpers';

const balanceOf = (app: ReturnType<typeof setup>['app'], id: number) => app.account.me(id).balance;
const code = (fn: () => unknown) => {
  try { fn(); } catch (e) { return (e as DomainError).code; }
  return 'OK';
};

describe('аккаунт и спин', () => {
  it('новый игрок получает баланс и стартовый набор', () => {
    const { app } = setup();
    const { user } = app.account.register();
    expect(user.balance).toBe(START_BALANCE);
    expect(app.collection.list(user.id).map(s => s.rarity)).toEqual(['rare', 'uncommon', 'common', 'common', 'common']);
  });

  it('спин списывает стоимость и добавляет номер в начало коллекции', () => {
    const { app } = setup();
    const { user } = app.account.register();
    const res = app.spin.spin(user.id, 'epic');
    expect(res.balance).toBe(START_BALANCE - SPIN_COST);
    expect(res.sim.rarity).toBe('epic');
    expect(app.collection.list(user.id)[0].id).toBe(res.sim.id);
  });

  it('без денег спин запрещён и баланс не уходит в минус', () => {
    const { app } = setup();
    const { user } = app.account.register();
    for (let i = 0; i < START_BALANCE / SPIN_COST; i++) app.spin.spin(user.id);
    expect(code(() => app.spin.spin(user.id))).toBe('INSUFFICIENT_FUNDS');
    expect(balanceOf(app, user.id)).toBe(0);
  });

  it('мгновенная продажа', () => {
    const { app } = setup();
    const { user } = app.account.register();
    const sim = app.collection.list(user.id)[0];
    const res = app.collection.sell(user.id, sim.id);
    expect(res.amount).toBe(instantSellPrice(sim.value));
    expect(res.balance).toBe(START_BALANCE + res.amount);
    expect(code(() => app.collection.sell(user.id, sim.id))).toBe('NOT_FOUND');
  });
});

describe('аукцион', () => {
  it('ставка держит эскроу и возвращается перебитому игроку', () => {
    const { app, notices } = setup();
    app.market.ensureMarketLots();
    const a = app.account.register().user;
    const b = app.account.register().user;
    const lot = app.market.snapshot().lots[0];

    const r1 = app.market.bid(a.id, lot.id);
    expect(r1.balance).toBe(START_BALANCE - r1.lot.bid);
    expect(code(() => app.market.bid(a.id, lot.id))).toBe('ALREADY_LEADER');

    const r2 = app.market.bid(b.id, lot.id);
    expect(r2.lot.bid).toBe(r1.lot.bid + lot.step);
    expect(balanceOf(app, a.id)).toBe(START_BALANCE);
    expect(notices(a.id)).toEqual([expect.objectContaining({ kind: 'outbid' })]);
  });

  it('победитель получает номер после окончания', () => {
    const { app, advance, notices } = setup();
    app.market.ensureMarketLots();
    const a = app.account.register().user;
    const lot = app.market.snapshot().lots[0];
    app.market.bid(a.id, lot.id);

    advance(lot.endsAt - 1_000_000 + 10_000);
    app.market.tick();

    expect(app.collection.list(a.id).some(s => s.id === lot.sim.id)).toBe(true);
    expect(notices(a.id)).toEqual([expect.objectContaining({ kind: 'won' })]);
    expect(app.market.snapshot().lots.filter(l => l.seller.id === null)).toHaveLength(6);
  });

  it('лот игрока: продажа другому игроку', () => {
    const { app, advance, notices } = setup();
    const seller = app.account.register().user;
    const buyer = app.account.register().user;
    const sim = app.collection.list(seller.id)[0];

    const { lot } = app.market.listSim(seller.id, sim.id, 500);
    expect(app.collection.list(seller.id).some(s => s.id === sim.id)).toBe(false);
    expect(code(() => app.market.bid(seller.id, lot.id))).toBe('OWN_LOT');

    const bid = app.market.bid(buyer.id, lot.id);
    expect(bid.lot.bid).toBe(500); // первая ставка принимает стартовую цену
    expect(code(() => app.market.cancel(seller.id, lot.id))).toBe('HAS_BIDS');

    advance(USER_LOT_DURATION_S * 1000 + 7000);
    app.market.tick();

    expect(balanceOf(app, seller.id)).toBe(START_BALANCE + 500);
    expect(balanceOf(app, buyer.id)).toBe(START_BALANCE - 500);
    expect(app.collection.list(buyer.id).some(s => s.id === sim.id)).toBe(true);
    expect(notices(seller.id)).toEqual([expect.objectContaining({ kind: 'sold', amount: 500 })]);
  });

  it('лот без ставок возвращается владельцу; снятие тоже', () => {
    const { app, advance, notices } = setup();
    const u = app.account.register().user;
    const [s1, s2] = app.collection.list(u.id);

    const { lot: l1 } = app.market.listSim(u.id, s1.id, 1000);
    app.market.cancel(u.id, l1.id);
    expect(app.collection.list(u.id)[0].id).toBe(s1.id);

    app.market.listSim(u.id, s2.id, 1000);
    advance(USER_LOT_DURATION_S * 1000 + 1);
    app.market.tick();
    expect(app.collection.list(u.id)[0].id).toBe(s2.id);
    expect(notices(u.id)).toEqual([expect.objectContaining({ kind: 'unsold' })]);
  });

  it('бот перебивает ставку игрока и возвращает ему деньги', () => {
    let r = 0.5;
    const { app, notices } = setup({ rng: () => r });
    app.market.ensureMarketLots();
    const u = app.account.register().user;
    const lot = app.market.snapshot().lots[0];
    app.market.bid(u.id, lot.id);

    r = 0; // теперь боты ставят на каждом тике
    app.market.tick();
    expect(balanceOf(app, u.id)).toBe(START_BALANCE);
    expect(notices(u.id)[0]).toMatchObject({ kind: 'outbid' });
    expect(app.market.snapshot().lots.find(l => l.id === lot.id)!.leaderId).toBeNull();
  });

  it('некорректная стартовая цена отклоняется', () => {
    const { app } = setup();
    const u = app.account.register().user;
    const sim = app.collection.list(u.id)[0];
    expect(code(() => app.market.listSim(u.id, sim.id, 1))).toBe('BAD_REQUEST');
    expect(code(() => app.market.listSim(u.id, sim.id, 10.5))).toBe('BAD_REQUEST');
  });
});

describe('рейтинг', () => {
  it('включает ботов и текущего игрока', () => {
    const { app } = setup();
    const u = app.account.register().user;
    const board = app.leaderboard.get(u.id, 'value');
    expect(board.entries.length).toBeGreaterThan(10);
    expect(board.entries[board.myRank - 1]).toMatchObject({ me: true, name: 'Вы', count: 5 });
  });
});

describe('массовая продажа', () => {
  it('продаёт только свои номера из инвентаря одной транзакцией', () => {
    const { app } = setup();
    const u = app.account.register().user;
    const other = app.account.register().user;
    const [a, b, c, ...rest] = app.collection.list(u.id);
    const foreign = app.collection.list(other.id)[0];
    app.market.listSim(u.id, c.id, 1000); // выставленный — не продаётся

    const res = app.collection.sellMany(u.id, [a.id, b.id, b.id, c.id, foreign.id, 'nope']);
    expect(res.sold).toBe(2);
    expect(res.amount).toBe(instantSellPrice(a.value) + instantSellPrice(b.value));
    expect(res.balance).toBe(START_BALANCE + res.amount);
    expect(app.collection.list(u.id)).toEqual(rest);
    expect(app.collection.list(other.id)).toHaveLength(5);
  });

  it('пустой список ничего не меняет', () => {
    const { app } = setup();
    const u = app.account.register().user;
    expect(app.collection.sellMany(u.id, [])).toEqual({ balance: START_BALANCE, amount: 0, sold: 0 });
  });
});

describe('обучение', () => {
  it('новый игрок начинает с шага 0, прогресс сохраняется', () => {
    const { app } = setup();
    const u = app.account.register().user;
    expect(u.tutorial).toBe(0);
    app.account.setTutorial(u.id, 5);
    expect(app.account.me(u.id).tutorial).toBe(5);
    app.account.setTutorial(u.id, -1);
    expect(app.account.me(u.id).tutorial).toBe(-1);
    expect(() => app.account.setTutorial(u.id, -2)).toThrow();
  });
});
