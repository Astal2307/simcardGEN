import { create } from 'zustand';
import { RARITY, RARITIES, UPGRADES, type PityDTO, type UpgradeId, type UpgradesDTO } from '@simrush/shared';
import { api } from '../api/endpoints';
import { vibrate } from '../lib/haptics';
import { attempt, useGame } from './game';
import { toast } from './toast';

interface UpgradesState {
  data: UpgradesDTO | null;
  buying: UpgradeId | null;
  /** Сколько апгрейдов куплено за сессию (для обучения). */
  buyCount: number;
  refresh(): Promise<void>;
  buy(id: UpgradeId): Promise<void>;
  setPity(pity: PityDTO[]): void;
}

export const useUpgrades = create<UpgradesState>((set, get) => ({
  data: null,
  buying: null,
  buyCount: 0,

  async refresh() {
    try {
      set({ data: await api.upgrades() });
    } catch { /* обновится после следующего действия */ }
  },

  async buy(id) {
    if (get().buying) return;
    set({ buying: id });
    await attempt(async () => {
      const { balance, upgrades } = await api.buyUpgrade(id);
      useGame.getState().setBalance(balance);
      set({ data: upgrades, buyCount: get().buyCount + 1 });
      vibrate([20, 40, 20]);
      const u = UPGRADES[id];
      toast(`${RARITY[RARITIES[u.tier - 1]].name}+ · ${u.period}-я`, RARITY[RARITIES[u.tier - 1]].color);
    });
    set({ buying: null });
  },

  setPity(pity) {
    const data = get().data;
    if (data) set({ data: { ...data, pity } });
  }
}));
