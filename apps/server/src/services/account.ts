import { randomBytes } from 'node:crypto';
import { START_BALANCE, TOPUP_AMOUNT, TUTORIAL_DONE, type BalanceResponse, type Rarity, type SessionResponse, type UserDTO } from '@simrush/shared';
import { DomainError, notFound } from '../domain/errors';
import { createSim } from '../domain/sim-factory';
import type { User } from '../repositories/users';
import { unitOfWork, type ServiceContext } from './context';

/**
 * Стартовая коллекция нового игрока (снизу вверх).
 * Три обычных — чтобы в обучении гарантированно хватило на крафт.
 */
const STARTER: Rarity[] = ['common', 'common', 'common', 'uncommon', 'rare'];

const toUserDTO = (u: User): UserDTO => ({ id: u.id, name: u.name, balance: u.balance, tutorial: u.tutorial });

export class AccountService {
  constructor(private readonly ctx: ServiceContext) {}

  /** Создаёт гостевой аккаунт со стартовым балансом и стартовым набором номеров. */
  register(): SessionResponse {
    const { users, sims, rng } = this.ctx;
    return unitOfWork(this.ctx, () => {
      const now = this.ctx.now();
      const user = users.create(randomBytes(24).toString('base64url'), START_BALANCE, now);
      for (const r of STARTER) sims.insert(createSim(rng, r), user.id, 'owned', now);
      return { token: user.token, user: toUserDTO(user) };
    });
  }

  authenticate(token: string): User | undefined {
    return this.ctx.users.findByToken(token);
  }

  me(userId: number): UserDTO {
    const user = this.ctx.users.findById(userId);
    if (!user) throw notFound('Игрок');
    return toUserDTO(user);
  }

  /** Сохраняет прогресс обучения (TUTORIAL_DONE — пройдено или пропущено). */
  setTutorial(userId: number, step: number): void {
    if (!Number.isInteger(step) || step < TUTORIAL_DONE || step > 100) throw new DomainError('BAD_REQUEST', 'Некорректный шаг');
    this.ctx.users.setTutorial(userId, step);
  }

  /** Демо-пополнение баланса. */
  topUp(userId: number): BalanceResponse {
    return unitOfWork(this.ctx, () => {
      const balance = this.ctx.users.adjustBalance(userId, TOPUP_AMOUNT);
      if (balance === null) throw notFound('Игрок');
      return { balance };
    });
  }
}
