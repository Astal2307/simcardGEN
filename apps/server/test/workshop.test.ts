import { describe, expect, it } from 'vitest';
import {
  classifyRarity, RARITIES, rarityRank, upgradeWinSectors, WHEEL_SECTORS, wheelLayout, type Rarity
} from '@simrush/shared';
import type { DomainError } from '../src/domain/errors';
import { genDigits } from '../src/domain/generator';
import { setup } from './helpers';

const d = (s: string) => s.split('').map(Number);
const code = (fn: () => unknown) => {
  try { fn(); } catch (e) { return (e as DomainError).code; }
  return 'OK';
};

/** Игрок с номерами заданных цифр и редкостей. */
function player(rng?: () => number) {
  const t = setup(rng ? { rng } : {});
  const u = t.app.account.register().user;
  let n = 0;
  const give = (digits: string, rarity: Rarity = classifyRarity(d(digits))) =>
    t.app.ctx.sims.insert({ id: `s${++n}`, digits: d(digits), rarity, value: 100 }, u.id, 'owned', 1).id;
  const owns = (id: string) => t.app.collection.list(u.id).some(s => s.id === id);
  return { ...t, u, give, owns };
}

describe('редкость по цифрам', () => {
  it('совпадает с генератором (или выше — случайный узор)', () => {
    for (const r of RARITIES) {
      let same = 0;
      for (let i = 0; i < 400; i++) {
        const got = classifyRarity(genDigits(Math.random, r));
        expect(rarityRank(got)).toBeGreaterThanOrEqual(rarityRank(r));
        if (got === r) same++;
      }
      // генератор иногда выдаёт узор сильнее заявленного (напр. круглый хвост 0-000 — это уже 4 одинаковых)
      expect(same / 400).toBeGreaterThan(0.75);
    }
  });

  it('узнаёт узоры', () => {
    expect(classifyRarity(d('9007777777'))).toBe('legendary');
    expect(classifyRarity(d('9004777777'))).toBe('epic');
    expect(classifyRarity(d('9002345678'))).toBe('epic');
    expect(classifyRarity(d('9001231111'))).toBe('rare');
    expect(classifyRarity(d('9005121212'))).toBe('rare');
    expect(classifyRarity(d('9001234111'))).toBe('uncommon');
    expect(classifyRarity(d('9001231221'))).toBe('uncommon');
    expect(classifyRarity(d('9001234560'))).toBe('common');
  });
});

describe('колесо апгрейда', () => {
  it('чем выше цель относительно жертвы, тем меньше секторов', () => {
    const wins = RARITIES.map(r => upgradeWinSectors('common', r));
    expect(wins).toEqual([...wins].sort((a, b) => b - a));
    expect(upgradeWinSectors('legendary', 'common')).toBe(38);
    for (let w = 1; w <= 38; w++) expect(wheelLayout(w).filter(Boolean)).toHaveLength(w);
  });
});

describe('крафт', () => {
  const rareBurns = (give: (s: string) => string) => [give('9001231111'), give('9001232222'), give('9001233333')];

  it('цифра случайная и всегда другая; сожжённые номера пропадают', () => {
    const seen = new Set<number>();
    for (let k = 0; k < 9; k++) {
      const { app, u, give, owns } = player(() => (k + 0.5) / 9);
      const target = give('9001234560');
      const burns = rareBurns(give);
      const res = app.workshop.craft(u.id, target, burns, 9);
      expect(res.sim.digits.slice(0, 9).join('')).toBe('900123456');
      expect(res.sim.digits[9]).not.toBe(0);
      seen.add(res.sim.digits[9]);
      burns.forEach(b => expect(owns(b)).toBe(false));
    }
    expect(seen.size).toBeGreaterThan(5);
  });

  it('потолок: три редких не поднимают номер до легендарного', () => {
    for (let k = 0; k < 9; k++) {
      const { app, u, give } = player(() => (k + 0.5) / 9);
      const res = app.workshop.craft(u.id, give('9004777777'), rareBurns(give), 3);
      expect(res.sim.digits[3]).not.toBe(7); // 7 дала бы 777-77-77
      expect(res.sim.rarity).toBe('epic');
    }
  });

  it('три эпических могут поднять эпический до легендарного', () => {
    // кандидаты для позиции 3 (было 4): 0 1 2 3 5 6 7 8 9 → 7 — седьмой
    const { app, u, give } = player(() => 6.5 / 9);
    const burns = [give('9001234567'), give('9002345678'), give('9003456789')];
    const res = app.workshop.craft(u.id, give('9004777777'), burns, 3);
    expect(res.sim.digits.join('')).toBe('9007777777');
    expect(res.sim.rarity).toBe('legendary');
    expect(res.album.some(h => h.collection === 'monolith')).toBe(true);
  });

  it('проверяет правила', () => {
    const { app, u, give } = player();
    const epic = give('9004777777');
    const commons = [give('9001234560'), give('9001234561'), give('9001234562')];
    const rares = rareBurns(give);
    // обычные не тянут эпический (разница больше 1)
    expect(code(() => app.workshop.craft(u.id, epic, commons, 3))).toBe('BAD_REQUEST');
    // разная редкость сжигаемых
    expect(code(() => app.workshop.craft(u.id, epic, [rares[0], rares[1], commons[0]], 3))).toBe('BAD_REQUEST');
    // первая девятка
    expect(code(() => app.workshop.craft(u.id, epic, rares, 0))).toBe('BAD_REQUEST');
    // повтор и цель среди жертв
    expect(code(() => app.workshop.craft(u.id, epic, [rares[0], rares[0], rares[1]], 3))).toBe('BAD_REQUEST');
    expect(code(() => app.workshop.craft(u.id, rares[0], [rares[0], rares[1], rares[2]], 3))).toBe('BAD_REQUEST');
    // ничего не сгорело
    expect(app.collection.list(u.id).length).toBe(5 + 7);
  });
});

describe('апгрейд', () => {
  const layout = wheelLayout(upgradeWinSectors('rare', 'rare'));
  const sectorRng = (win: boolean) => {
    const i = layout.findIndex(x => x === win);
    return () => (i + 0.5) / WHEEL_SECTORS;
  };

  it('выигрыш: жертва сгорает, желаемый номер появляется', () => {
    const { app, u, give, owns } = player(sectorRng(true));
    const sac = give('9001231111');
    const res = app.workshop.upgrade(u.id, sac, d('9005121212'));
    expect(res.win).toBe(true);
    expect(layout[res.sector]).toBe(true);
    expect(res.sim).toMatchObject({ digits: d('9005121212'), rarity: 'rare' });
    expect(owns(sac)).toBe(false);
    expect(owns(res.sim!.id)).toBe(true);
  });

  it('первый апгрейд игрока выигрывает всегда, дальше — по колесу', () => {
    const { app, u, give } = player(sectorRng(false));
    const first = app.workshop.upgrade(u.id, give('9001231111'), d('9005121212'));
    expect(first.win).toBe(true);
    expect(layout[first.sector]).toBe(true); // стрелка стоит на выигрышном секторе обычного колеса
    expect(app.workshop.upgrade(u.id, give('9001232222'), d('9005121212')).win).toBe(false);
  });

  it('проигрыш: жертва сгорает, номера нет', () => {
    const { app, u, give, owns } = player(sectorRng(false));
    app.ctx.users.useFreeUpgrade(u.id); // гарантированный первый апгрейд уже потрачен
    const sac = give('9001231111');
    const before = app.collection.list(u.id).length;
    const res = app.workshop.upgrade(u.id, sac, d('9005121212'));
    expect(res).toMatchObject({ win: false, sim: null, album: [] });
    expect(owns(sac)).toBe(false);
    expect(app.collection.list(u.id).length).toBe(before - 1);
  });

  it('некорректный номер — ничего не сгорает', () => {
    const { app, u, give, owns } = player();
    const sac = give('9001231111');
    expect(code(() => app.workshop.upgrade(u.id, sac, d('8001231111')))).toBe('BAD_REQUEST');
    expect(code(() => app.workshop.upgrade(u.id, sac, [9, 1, 2]))).toBe('BAD_REQUEST');
    expect(owns(sac)).toBe(true);
  });
});
