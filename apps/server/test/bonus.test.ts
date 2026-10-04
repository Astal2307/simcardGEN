import { describe, expect, it } from 'vitest';
import { DAILY_BONUS_REWARDS, START_BALANCE } from '@simrush/shared';
import type { DomainError } from '../src/domain/errors';
import { setup } from './helpers';

const DAY = 86_400_000;

function player() {
  const t = setup();
  const user = t.app.account.register().user;
  return { ...t, user, claim: () => t.app.bonus.claim(user.id), status: () => t.app.bonus.status(user.id) };
}

describe('ежедневный бонус', () => {
  it('первый день доступен сразу и начисляет награду', () => {
    const { claim, status } = player();
    expect(status()).toMatchObject({ day: 1, claimedToday: false });
    const res = claim();
    expect(res.reward).toBe(DAILY_BONUS_REWARDS[0]);
    expect(res.balance).toBe(START_BALANCE + DAILY_BONUS_REWARDS[0]);
    expect(res.bonus).toMatchObject({ day: 1, claimedToday: true });
  });

  it('повторно в тот же день нельзя', () => {
    const { claim } = player();
    claim();
    try {
      claim();
      expect.unreachable();
    } catch (e) {
      expect((e as DomainError).code).toBe('BONUS_CLAIMED');
    }
  });

  it('серия растёт по дням и упирается в 7-й день', () => {
    const { claim, advance } = player();
    const got: number[] = [];
    for (let i = 0; i < 9; i++) {
      got.push(claim().reward);
      advance(DAY);
    }
    expect(got).toEqual([...DAILY_BONUS_REWARDS, DAILY_BONUS_REWARDS[6], DAILY_BONUS_REWARDS[6]]);
  });

  it('пропуск дня сбрасывает серию', () => {
    const { claim, status, advance } = player();
    claim();
    advance(DAY);
    claim();
    advance(2 * DAY);
    expect(status()).toMatchObject({ day: 1, claimedToday: false });
    expect(claim().bonus.day).toBe(1);
  });

  it('новый день наступает в полночь по МСК', () => {
    const { claim, status, clock } = player();
    // 20:59:59 UTC = 23:59:59 МСК
    clock.now = 10 * DAY + 21 * 3_600_000 - 1000;
    claim();
    expect(status().nextAt).toBe(10 * DAY + 21 * 3_600_000);
    clock.now += 1000;
    expect(status()).toMatchObject({ day: 2, claimedToday: false });
  });
});
