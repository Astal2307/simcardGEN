import {
  ANTI_SNIPE_S, bidStep, MAX_LIST_MULTIPLIER, nextBid, round10, USER_LOT_DURATION_S,
  type BidResponse, type ListResponse, type LotsSnapshot
} from '@simrush/shared';
import { MARKET, BOT_NAMES } from '../domain/bots';
import { DomainError, insufficientFunds, notFound } from '../domain/errors';
import { MARKET_WEIGHTS, pickRarity } from '../domain/generator';
import type { Outbox } from '../domain/notifier';
import { newId, pick, randInt } from '../domain/random';
import { createSim } from '../domain/sim-factory';
import { toLotDTO, type Lot, type LotWithSim } from '../repositories/lots';
import type { CollectionService } from './collection';
import { unitOfWork, type ServiceContext } from './context';
import type { QuestService } from './quests';
import type { AlbumService } from './album';

/**
 * Аукцион: ставки игроков с эскроу, поведение ботов и закрытие лотов.
 * Деньги лидера списываются в момент ставки и возвращаются, если его перебили.
 */
export class MarketService {
  constructor(
    private readonly ctx: ServiceContext,
    private readonly collection: CollectionService,
    private readonly quests: QuestService,
    private readonly album: AlbumService
  ) {}

  snapshot(): LotsSnapshot {
    return { serverTime: this.ctx.now(), lots: this.ctx.lots.listOpen().map(toLotDTO) };
  }

  /** Заполняет рынок бот-лотами (при первом запуске — с фиксированными таймерами). */
  ensureMarketLots(): void {
    this.run(out => {
      const now = this.ctx.now();
      const open = this.ctx.lots.countOpenMarketLots();
      if (open === 0) {
        for (const s of MARKET.seedDurationsS) this.createMarketLot(now, s);
        out.lotsChanged = true;
      } else {
        out.lotsChanged = this.refill(now);
      }
    });
  }

  /** Один шаг симуляции рынка: закрытие истёкших лотов, ставки ботов, пополнение. */
  tick(): void {
    const { lots, rng } = this.ctx;
    this.run(out => {
      const now = this.ctx.now();
      let changed = false;
      for (const lot of lots.listOpen()) {
        if (lot.endsAt <= now) {
          this.settle(lot, out);
          changed = true;
          continue;
        }
        const chance = lot.sellerId === null ? MARKET.botBidOnMarketLot : MARKET.botBidOnUserLot;
        if (rng() < chance) {
          this.botBid(lot, now, out);
          changed = true;
        }
      }
      if (this.refill(now)) changed = true;
      out.lotsChanged = changed;
    });
  }

  bid(userId: number, lotId: string): BidResponse {
    const { users, lots } = this.ctx;
    return this.run(out => {
      const now = this.ctx.now();
      const lot = lots.findById(lotId);
      if (!lot) throw notFound('Лот');
      if (lot.status !== 'open' || lot.endsAt <= now) throw new DomainError('LOT_CLOSED', 'Аукцион завершён');
      if (lot.sellerId === userId) throw new DomainError('OWN_LOT', 'Нельзя ставить на свой лот');
      if (lot.leaderId === userId) throw new DomainError('ALREADY_LEADER', 'Вы уже лидер');

      const price = nextBid(lot);
      const balance = users.adjustBalance(userId, -price);
      if (balance === null) throw insufficientFunds();
      this.refundLeader(lot, out);

      const user = users.findById(userId)!;
      Object.assign(lot, { bid: price, bids: lot.bids + 1, leaderId: userId, leaderName: user.name });
      this.extendIfEnding(lot, now);
      lots.save(lot);
      this.quests.track(out, userId, 'bid');
      out.lotsChanged = true;
      return { balance, lot: toLotDTO(lot) };
    });
  }

  /** Выставляет номер из коллекции игрока на аукцион. */
  listSim(userId: number, simId: string, startPrice: number): ListResponse {
    const { users, sims, lots } = this.ctx;
    return this.run(out => {
      const sim = this.collection.ownedSim(userId, simId);
      const step = bidStep(sim.value);
      if (!Number.isInteger(startPrice) || startPrice < step || startPrice > sim.value * MAX_LIST_MULTIPLIER) {
        throw new DomainError('BAD_REQUEST', 'Некорректная стартовая цена');
      }
      const now = this.ctx.now();
      const user = users.findById(userId)!;
      sims.setStatus(sim.id, 'listed');
      const lot = lots.insert({
        id: newId(), simId: sim.id, sellerId: userId, sellerName: user.name,
        bid: startPrice, step, bids: 0, leaderId: null, leaderName: null,
        endsAt: now + USER_LOT_DURATION_S * 1000
      }, now);
      this.quests.track(out, userId, 'list_lot');
      out.lotsChanged = true;
      return { lot: toLotDTO({ ...lot, sim: { ...sim, status: 'listed' } }) };
    });
  }

  /** Снимает свой лот, пока на него никто не поставил. */
  cancel(userId: number, lotId: string): void {
    const { sims, lots } = this.ctx;
    this.run(out => {
      const lot = lots.findById(lotId);
      if (!lot || lot.status !== 'open' || lot.sellerId !== userId) throw notFound('Лот');
      if (lot.bids > 0) throw new DomainError('HAS_BIDS', 'На лот уже есть ставки');
      lot.status = 'closed';
      lots.save(lot);
      sims.transfer(lot.simId, userId, 'owned', this.ctx.now());
      out.lotsChanged = true;
    });
  }

  // --- внутреннее ---

  private run<T>(fn: (out: Outbox) => T): T {
    return unitOfWork(this.ctx, fn, out => {
      if (out.lotsChanged) this.ctx.notifier.broadcast('lots', this.snapshot());
    });
  }

  /** Закрывает лот: номер уходит победителю, деньги — продавцу. */
  private settle(lot: LotWithSim, out: Outbox): void {
    const { users, sims, lots } = this.ctx;
    const now = this.ctx.now();
    const { digits, rarity } = lot.sim;

    if (lot.leaderId !== null) {
      sims.transfer(lot.simId, lot.leaderId, 'owned', now);
      out.toUser(lot.leaderId, 'notice', { kind: 'won', digits, rarity });
      out.toUser(lot.leaderId, 'collection', {});
      this.quests.track(out, lot.leaderId, 'win_lot');
      this.album.register(lot.leaderId, lot.sim);
    } else if (lot.bids === 0 && lot.sellerId !== null) {
      sims.transfer(lot.simId, lot.sellerId, 'owned', now);
      out.toUser(lot.sellerId, 'notice', { kind: 'unsold', digits });
      out.toUser(lot.sellerId, 'collection', {});
    } else {
      sims.transfer(lot.simId, null, 'gone', now);
    }

    if (lot.sellerId !== null && lot.bids > 0) {
      const balance = users.adjustBalance(lot.sellerId, lot.bid)!;
      out.toUser(lot.sellerId, 'balance', { balance });
      out.toUser(lot.sellerId, 'notice', { kind: 'sold', amount: lot.bid });
      this.quests.track(out, lot.sellerId, 'sell_lot');
    }

    lot.status = 'closed';
    lots.save(lot);
  }

  private botBid(lot: LotWithSim, now: number, out: Outbox): void {
    const name = pick(this.ctx.rng, BOT_NAMES.filter(n => n !== lot.sellerName));
    const price = nextBid(lot);
    this.refundLeader(lot, out);
    Object.assign(lot, { bid: price, bids: lot.bids + 1, leaderId: null, leaderName: name });
    // на лотах игроков боты не продлевают таймер, иначе аукцион может тянуться бесконечно
    if (lot.sellerId === null) this.extendIfEnding(lot, now);
    this.ctx.lots.save(lot);
  }

  /** Возвращает эскроу текущему лидеру-игроку, которого перебили. */
  private refundLeader(lot: LotWithSim, out: Outbox): void {
    if (lot.leaderId === null) return;
    const balance = this.ctx.users.adjustBalance(lot.leaderId, lot.bid)!;
    out.toUser(lot.leaderId, 'balance', { balance });
    out.toUser(lot.leaderId, 'notice', { kind: 'outbid', digits: lot.sim.digits, rarity: lot.sim.rarity });
  }

  private extendIfEnding(lot: Lot, now: number): void {
    if (lot.endsAt - now < ANTI_SNIPE_S * 1000) lot.endsAt += ANTI_SNIPE_S * 1000;
  }

  private refill(now: number): boolean {
    const { rng } = this.ctx;
    let added = false;
    for (let n = this.ctx.lots.countOpenMarketLots(); n < MARKET.lotCount; n++) {
      this.createMarketLot(now, MARKET.minDurationS + randInt(rng, MARKET.maxDurationS - MARKET.minDurationS));
      added = true;
    }
    return added;
  }

  private createMarketLot(now: number, durationS: number): void {
    const { rng, sims, lots } = this.ctx;
    const sim = sims.insert(createSim(rng, pickRarity(rng, MARKET_WEIGHTS)), null, 'listed', now);
    lots.insert({
      id: newId(),
      simId: sim.id,
      sellerId: null,
      sellerName: pick(rng, BOT_NAMES),
      bid: round10(sim.value * (0.55 + rng() * 0.3)),
      step: bidStep(sim.value),
      bids: 1 + randInt(rng, 5),
      leaderId: null,
      leaderName: null,
      endsAt: now + durationS * 1000
    }, now);
  }
}
