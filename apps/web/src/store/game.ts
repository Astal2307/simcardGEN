import { create } from 'zustand';
import { fmt, RARITY, shortNum, TOPUP_AMOUNT, type LotDTO, type LotsSnapshot, type SimDTO, type UserDTO } from '@simrush/shared';
import { api } from '../api/endpoints';
import { ApiError } from '../api/http';
import { restoreSession } from '../api/session';
import { COLORS, toast } from './toast';

type Status = 'loading' | 'ready' | 'error';

interface GameState {
  status: Status;
  user: UserDTO | null;
  balance: number;
  sims: SimDTO[];
  lots: LotDTO[];
  /** Смещение часов сервера относительно локальных, мс. */
  clockOffset: number;
  /** Сколько ставок сделано за сессию (для обучения). */
  bidCount: number;

  boot(): Promise<void>;
  refreshSims(): Promise<void>;
  /** Добавляет выпавший номер в коллекцию (после анимации спина). */
  addSim(sim: SimDTO): void;
  setBalance(balance: number): void;
  /** Применяет снимок рынка и сверяет часы с сервером. */
  applyLots(snapshot: LotsSnapshot): void;
  topUp(): Promise<void>;
  sell(simId: string): Promise<boolean>;
  /** Мгновенная продажа нескольких номеров. */
  sellMany(simIds: string[]): Promise<boolean>;
  listSim(simId: string, startPrice: number): Promise<boolean>;
  bid(lotId: string): Promise<void>;
  cancelLot(lotId: string): Promise<void>;
}

/** Показывает ошибку API тостом; возвращает false, если операция не удалась. */
export async function attempt(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch (err) {
    toast(err instanceof ApiError ? err.message : 'Что-то пошло не так', COLORS.warning);
    return false;
  }
}

let booting: Promise<void> | undefined;

export const useGame = create<GameState>((set, get) => {
  const upsertLot = (lot: LotDTO) => set(st => ({ lots: [...st.lots.filter(l => l.id !== lot.id), lot] }));

  async function start() {
    set({ status: 'loading' });
    try {
      const user = await restoreSession();
      const [sims, lots] = await Promise.all([api.sims(), api.lots()]);
      get().applyLots(lots);
      set({ user, balance: user.balance, sims, status: 'ready' });
    } catch {
      set({ status: 'error' });
    }
  }

  return {
    status: 'loading',
    user: null,
    balance: 0,
    sims: [],
    lots: [],
    clockOffset: 0,
    bidCount: 0,

    boot() {
      // StrictMode вызывает эффекты дважды — не создаём две сессии
      booting ??= start().finally(() => { booting = undefined; });
      return booting;
    },

    async refreshSims() {
      try {
        set({ sims: await api.sims() });
      } catch { /* следующее событие или действие обновит */ }
    },

    addSim(sim) {
      set(st => ({ sims: [sim, ...st.sims.filter(s => s.id !== sim.id)] }));
    },

    setBalance(balance) {
      set({ balance });
    },

    applyLots(s) {
      set({ lots: s.lots, clockOffset: s.serverTime - Date.now() });
    },

    async topUp() {
      await attempt(async () => {
        const { balance } = await api.topUp();
        set({ balance });
        toast('+' + fmt(TOPUP_AMOUNT), COLORS.positive);
      });
    },

    sell(simId) {
      return attempt(async () => {
        const { balance, amount } = await api.sell(simId);
        set(st => ({ balance, sims: st.sims.filter(s => s.id !== simId) }));
        toast('+' + fmt(amount), COLORS.positive);
      });
    },

    sellMany(simIds) {
      return attempt(async () => {
        const { balance, amount, sold } = await api.sellMany(simIds);
        const gone = new Set(simIds);
        set(st => ({ balance, sims: st.sims.filter(s => !gone.has(s.id)) }));
        // часть номеров могла уйти на аукцион с другого устройства — сверяемся
        if (sold !== gone.size) void get().refreshSims();
        toast('+' + fmt(amount), COLORS.positive);
      });
    },

    listSim(simId, startPrice) {
      return attempt(async () => {
        const { lot } = await api.list(simId, startPrice);
        set(st => ({ sims: st.sims.filter(s => s.id !== simId) }));
        upsertLot(lot);
        toast('Выставлено · ' + shortNum(lot.sim.digits), RARITY[lot.sim.rarity].color);
      });
    },

    async bid(lotId) {
      await attempt(async () => {
        const { balance, lot } = await api.bid(lotId);
        set(st => ({ balance, bidCount: st.bidCount + 1 }));
        upsertLot(lot);
      });
    },

    async cancelLot(lotId) {
      await attempt(async () => {
        await api.cancel(lotId);
        set(st => ({ lots: st.lots.filter(l => l.id !== lotId) }));
        await get().refreshSims();
      });
    }
  };
});
