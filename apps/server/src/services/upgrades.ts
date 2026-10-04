import {
  activeGuarantees, UPGRADE_IDS, UPGRADES,
  type BuyUpgradeResponse, type PityDTO, type UpgradeId, type UpgradesDTO
} from '@simrush/shared';
import { DomainError, insufficientFunds, notFound } from '../domain/errors';
import type { UpgradesRepo } from '../repositories/upgrades';
import { unitOfWork, type ServiceContext } from './context';

const isUpgradeId = (v: string): v is UpgradeId => (UPGRADE_IDS as readonly string[]).includes(v);

/** Дерево апгрейдов и счётчики гарантий спина. */
export class UpgradeService {
  constructor(
    private readonly ctx: ServiceContext,
    private readonly repo: UpgradesRepo
  ) {}

  state(userId: number): UpgradesDTO {
    return { owned: this.repo.owned(userId), pity: this.pity(userId) };
  }

  buy(userId: number, id: string): BuyUpgradeResponse {
    return unitOfWork(this.ctx, out => {
      if (!isUpgradeId(id)) throw notFound('Апгрейд');
      const def = UPGRADES[id];
      const owned = new Set(this.repo.owned(userId));
      if (owned.has(id)) throw new DomainError('UPGRADE_OWNED', 'Уже куплено');
      if (def.requires && !owned.has(def.requires)) throw new DomainError('UPGRADE_LOCKED', 'Сначала откройте предыдущий апгрейд');

      const balance = this.ctx.users.adjustBalance(userId, -def.cost);
      if (balance === null) throw insufficientFunds();
      this.repo.add(userId, id, this.ctx.now());
      out.toUser(userId, 'balance', { balance });
      return { balance, upgrades: this.state(userId) };
    });
  }

  /**
   * Засчитывает крутку во все действующие гарантии.
   * Возвращает минимальный гарантированный тир этой крутки (1 — гарантии нет).
   * Вызывается внутри транзакции спина.
   */
  advancePity(userId: number): number {
    const counts = this.repo.pity(userId);
    let minTier = 1;
    for (const g of activeGuarantees(this.repo.owned(userId))) {
      const next = (counts.get(g.tier) ?? 0) + 1;
      if (next >= g.period) {
        minTier = Math.max(minTier, g.tier);
        this.repo.setPity(userId, g.tier, 0);
      } else {
        this.repo.setPity(userId, g.tier, next);
      }
    }
    return minTier;
  }

  pity(userId: number): PityDTO[] {
    const counts = this.repo.pity(userId);
    return activeGuarantees(this.repo.owned(userId)).map(g => ({ ...g, count: Math.min(counts.get(g.tier) ?? 0, g.period - 1) }));
  }
}
