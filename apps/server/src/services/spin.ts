import { RARITIES, rarityRank, SPIN_COST, type Rarity, type SpinResponse } from '@simrush/shared';
import { insufficientFunds } from '../domain/errors';
import { pickRarity, SPIN_WEIGHTS, type RarityWeights } from '../domain/generator';
import { createSim } from '../domain/sim-factory';
import { toSimDTO } from '../repositories/sims';
import { unitOfWork, type ServiceContext } from './context';
import type { QuestService } from './quests';
import type { UpgradeService } from './upgrades';
import type { AlbumService } from './album';

/** Веса спина без тиров ниже minTier (тир = ранг редкости + 1); пропорции старших сохраняются. */
export function weightsFromTier(minTier: number): RarityWeights {
  const w = { ...SPIN_WEIGHTS };
  for (const r of RARITIES) if (rarityRank(r) + 1 < minTier) w[r] = 0;
  return w;
}

export class SpinService {
  constructor(
    private readonly ctx: ServiceContext,
    private readonly quests: QuestService,
    private readonly upgrades: UpgradeService,
    private readonly album: AlbumService,
    private readonly allowForcedRarity: boolean
  ) {}

  /** Списывает стоимость спина и выдаёт новый номер. forced учитывается только в демо-режиме. */
  spin(userId: number, forced?: Rarity): SpinResponse {
    const { users, sims, rng } = this.ctx;
    return unitOfWork(this.ctx, out => {
      const balance = users.adjustBalance(userId, -SPIN_COST);
      if (balance === null) throw insufficientFunds();
      const minTier = this.upgrades.advancePity(userId);
      const rarity = forced && this.allowForcedRarity ? forced : pickRarity(rng, weightsFromTier(minTier));
      const sim = sims.insert(createSim(rng, rarity), userId, 'owned', this.ctx.now());
      this.quests.track(out, userId, 'spin');
      if (rarityRank(rarity) >= rarityRank('rare')) this.quests.track(out, userId, 'spin_rare');
      const album = this.album.register(userId, sim);
      return { sim: toSimDTO(sim), balance, pity: this.upgrades.pity(userId), album };
    });
  }
}
