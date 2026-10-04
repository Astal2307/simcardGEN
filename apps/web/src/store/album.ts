import { create } from 'zustand';
import { ALBUM_BY_ID, ALBUM_GROUPS, ALBUMS, fmt, type AlbumHitDTO } from '@simrush/shared';
import { api } from '../api/endpoints';
import { vibrate } from '../lib/haptics';
import { attempt, useGame } from './game';
import { COLORS, toast } from './toast';

export const slotId = (collection: string, slot: string) => collection + ':' + slot;

interface AlbumState {
  /** Закрытые ячейки: «коллекция:ячейка». */
  filled: Set<string>;
  /** Коллекции, награда за которые получена. */
  claimed: Set<string>;
  claiming: string | null;
  /** Очередь анимаций: новые ячейки, по одной пачке на спин. */
  fx: { id: number; hits: AlbumHitDTO[] }[];
  refresh(): Promise<void>;
  /** Новые ячейки после спина: в альбом и в очередь анимаций. */
  applyHits(hits: AlbumHitDTO[]): void;
  shiftFx(): void;
  claim(collection: string): Promise<void>;
}

let fxSeq = 0;

/** Сколько коллекций показывать в одной анимации. */
const FX_MAX_ROWS = 4;
const groupOrder = (h: AlbumHitDTO) => -ALBUM_GROUPS.findIndex(g => g.id === ALBUM_BY_ID[h.collection].group);

export const useAlbum = create<AlbumState>((set, get) => ({
  filled: new Set(),
  claimed: new Set(),
  claiming: null,
  fx: [],

  async refresh() {
    try {
      const { filled, claimed } = await api.album();
      set({ filled: new Set(filled.map(f => slotId(f.collection, f.slot))), claimed: new Set(claimed) });
    } catch { /* обновится при следующем открытии */ }
  },

  applyHits(hits) {
    if (hits.length === 0) return;
    const filled = new Set(get().filled);
    hits.forEach(h => filled.add(slotId(h.collection, h.slot)));
    // редкие коллекции первыми
    const shown = [...hits].sort((a, b) => groupOrder(a) - groupOrder(b)).slice(0, FX_MAX_ROWS);
    set({ filled, fx: [...get().fx, { id: ++fxSeq, hits: shown }] });
  },

  shiftFx() {
    set({ fx: get().fx.slice(1) });
  },

  async claim(collection) {
    if (get().claiming) return;
    set({ claiming: collection });
    await attempt(async () => {
      const { balance, reward } = await api.claimAlbum(collection);
      useGame.getState().setBalance(balance);
      set({ claimed: new Set(get().claimed).add(collection) });
      vibrate([20, 40, 20]);
      toast(ALBUM_BY_ID[collection].name + ' · +' + fmt(reward), COLORS.gold);
    });
    set({ claiming: null });
  }
}));

export const filledCount = (filled: Set<string>, collection: string) =>
  ALBUM_BY_ID[collection].slots.filter(s => filled.has(slotId(collection, s.key))).length;

/** Есть ли собранная коллекция с незабранной наградой. */
export const hasClaimableAlbum = (st: { filled: Set<string>; claimed: Set<string> }) =>
  ALBUMS.some(a => !st.claimed.has(a.id) && filledCount(st.filled, a.id) === a.slots.length);
