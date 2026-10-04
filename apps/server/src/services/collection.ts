import { instantSellPrice, type SellManyResponse, type SellResponse, type SimDTO } from '@simrush/shared';
import { notFound } from '../domain/errors';
import { toSimDTO, type Sim } from '../repositories/sims';
import { unitOfWork, type ServiceContext } from './context';
import type { QuestService } from './quests';

export class CollectionService {
  constructor(
    private readonly ctx: ServiceContext,
    private readonly quests: QuestService
  ) {}

  list(userId: number): SimDTO[] {
    return this.ctx.sims.listOwned(userId).map(toSimDTO);
  }

  /** Номер из коллекции игрока, доступный для действий. */
  ownedSim(userId: number, simId: string): Sim {
    const sim = this.ctx.sims.findById(simId);
    if (!sim || sim.ownerId !== userId || sim.status !== 'owned') throw notFound('Номер');
    return sim;
  }

  /** Мгновенная продажа системе за долю стоимости. */
  sell(userId: number, simId: string): SellResponse {
    return unitOfWork(this.ctx, out => {
      const sim = this.ownedSim(userId, simId);
      const amount = instantSellPrice(sim.value);
      this.ctx.sims.transfer(sim.id, null, 'gone', this.ctx.now());
      const balance = this.ctx.users.adjustBalance(userId, amount)!;
      this.quests.track(out, userId, 'quick_sell');
      return { balance, amount };
    });
  }

  /**
   * Мгновенная продажа нескольких номеров одной транзакцией.
   * Номера, которые уже не в инвентаре (проданы, выставлены), пропускаются.
   */
  sellMany(userId: number, simIds: string[]): SellManyResponse {
    return unitOfWork(this.ctx, out => {
      const now = this.ctx.now();
      let amount = 0, sold = 0;
      for (const id of new Set(simIds)) {
        const sim = this.ctx.sims.findById(id);
        if (!sim || sim.ownerId !== userId || sim.status !== 'owned') continue;
        this.ctx.sims.transfer(sim.id, null, 'gone', now);
        amount += instantSellPrice(sim.value);
        sold++;
      }
      const balance = sold > 0 ? this.ctx.users.adjustBalance(userId, amount)! : this.ctx.users.findById(userId)!.balance;
      if (sold > 0) this.quests.track(out, userId, 'quick_sell', sold);
      return { balance, amount, sold };
    });
  }
}
