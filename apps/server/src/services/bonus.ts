import { DAILY_BONUS_MAX_DAY, dailyBonusReward, type ClaimBonusResponse, type DailyBonusDTO } from '@simrush/shared';
import { DomainError, notFound } from '../domain/errors';
import type { BonusState } from '../repositories/users';
import { unitOfWork, type ServiceContext } from './context';

/**
 * Ежедневный бонус с серией до 7 дней.
 * Пропуск дня сбрасывает серию на 1-й день; после 7-го каждый день даёт награду 7-го.
 */
export class BonusService {
  constructor(private readonly ctx: ServiceContext) {}

  status(userId: number): DailyBonusDTO {
    return this.describe(this.state(userId), this.today());
  }

  claim(userId: number): ClaimBonusResponse {
    return unitOfWork(this.ctx, out => {
      const today = this.today();
      const state = this.state(userId);
      if (state.lastDay === today) throw new DomainError('BONUS_CLAIMED', 'Бонус на сегодня уже получен');

      const day = this.nextDay(state, today);
      const reward = dailyBonusReward(day);
      if (!this.ctx.users.markBonusClaimed(userId, day, today)) {
        throw new DomainError('BONUS_CLAIMED', 'Бонус на сегодня уже получен');
      }
      const balance = this.ctx.users.adjustBalance(userId, reward)!;
      out.toUser(userId, 'balance', { balance });
      return { balance, reward, bonus: this.describe({ streak: day, lastDay: today }, today) };
    });
  }

  private state(userId: number): BonusState {
    const state = this.ctx.users.getBonus(userId);
    if (!state) throw notFound('Игрок');
    return state;
  }

  private today(): number {
    return this.ctx.calendar.dayOf(this.ctx.now());
  }

  private nextDay(state: BonusState, today: number): number {
    return state.lastDay === today - 1 ? Math.min(state.streak + 1, DAILY_BONUS_MAX_DAY) : 1;
  }

  private describe(state: BonusState, today: number): DailyBonusDTO {
    const claimedToday = state.lastDay === today;
    return {
      day: claimedToday ? state.streak : this.nextDay(state, today),
      claimedToday,
      nextAt: this.ctx.calendar.startOf(today + 1)
    };
  }
}
