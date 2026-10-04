import { create } from 'zustand';
import { fmt, type QuestDTO, type QuestsDTO } from '@simrush/shared';
import { api } from '../api/endpoints';
import { createRollover } from '../lib/day-rollover';
import { vibrate } from '../lib/haptics';
import { attempt, useGame } from './game';
import { COLORS, toast } from './toast';

interface QuestsState {
  data: QuestsDTO | null;
  /** id задания, награда за которое сейчас запрашивается. */
  claiming: string | null;
  apply(data: QuestsDTO): void;
  refresh(): Promise<void>;
  claim(questId: string): Promise<void>;
}

export const useQuests = create<QuestsState>((set, get) => {
  // в новый игровой день сервер выдаёт новые задания
  const scheduleRollover = createRollover(() => void get().refresh());

  return {
    data: null,
    claiming: null,

    apply(data) {
      set({ data });
      scheduleRollover(data.nextAt);
    },

    async refresh() {
      try {
        get().apply(await api.quests());
      } catch { /* обновится следующим событием */ }
    },

    async claim(questId) {
      if (get().claiming) return;
      set({ claiming: questId });
      await attempt(async () => {
        const { balance, reward, quests } = await api.claimQuest(questId);
        useGame.getState().setBalance(balance);
        get().apply(quests);
        vibrate(15);
        toast('Задание · +' + fmt(reward), COLORS.positive);
      });
      set({ claiming: null });
    }
  };
});

export const isQuestDone = (q: QuestDTO) => q.progress >= q.target;
export const hasClaimableQuests = (d: QuestsDTO | null) => !!d && d.quests.some(q => isQuestDone(q) && !q.claimed);
