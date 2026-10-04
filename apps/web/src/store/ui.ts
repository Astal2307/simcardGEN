import { create } from 'zustand';
import type { AlbumGroup, LeaderboardMetric, Rarity } from '@simrush/shared';

export type Tab = 'spin' | 'coll' | 'album' | 'auc' | 'upg' | 'rate';
export type RarityFilter = 'all' | Rarity;

/** Состояние навигации и фильтров — переживает переключение вкладок. */
interface UiState {
  tab: Tab;
  collFilter: RarityFilter;
  aucFilter: RarityFilter;
  albumFilter: 'all' | AlbumGroup;
  aucSeg: 'all' | 'mine';
  collSeg: 'list' | 'craft' | 'upgrade';
  rateSeg: LeaderboardMetric;
  /** id номера, для которого открыт bottom sheet. */
  sheet: string | null;
  /** Открыт ли bottom sheet наград (бонус + задания). */
  rewardsOpen: boolean;
  /** Открыто ли подтверждение «Продать все» по текущему фильтру. */
  sellAllOpen: boolean;
  set(patch: Partial<Omit<UiState, 'set'>>): void;
}

export const useUi = create<UiState>(set => ({
  tab: 'spin',
  collFilter: 'all',
  aucFilter: 'all',
  albumFilter: 'all',
  aucSeg: 'all',
  collSeg: 'list',
  rateSeg: 'value',
  sheet: null,
  rewardsOpen: false,
  sellAllOpen: false,
  set: patch => set(patch)
}));
