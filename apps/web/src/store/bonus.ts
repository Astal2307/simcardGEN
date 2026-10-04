import { create } from 'zustand';
import { fmt, type DailyBonusDTO } from '@simrush/shared';
import { api } from '../api/endpoints';
import { createRollover } from '../lib/day-rollover';
import { vibrate } from '../lib/haptics';
import { attempt, useGame } from './game';
import { COLORS, toast } from './toast';

interface BonusState {
  bonus: DailyBonusDTO | null;
  refresh(): Promise<void>;
  claim(): Promise<void>;
}

export const useBonus = create<BonusState>((set, get) => {
  // в полночь игрового дня бонус снова становится доступен — перечитываем статус
  const scheduleRollover = createRollover(() => void get().refresh());
  const apply = (bonus: DailyBonusDTO) => {
    set({ bonus });
    scheduleRollover(bonus.nextAt);
  };

  return {
    bonus: null,

    async refresh() {
      try {
        apply(await api.bonus());
      } catch { /* не критично: попробуем при следующем открытии */ }
    },

    async claim() {
      await attempt(async () => {
        const { balance, reward, bonus } = await api.claimBonus();
        useGame.getState().setBalance(balance);
        apply(bonus);
        vibrate([20, 40, 20]);
        toast('Бонус · +' + fmt(reward), COLORS.positive);
      });
    }
  };
});

export const isBonusAvailable = (b: DailyBonusDTO | null) => !!b && !b.claimedToday;
