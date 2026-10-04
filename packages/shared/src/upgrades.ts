/**
 * Апгрейды гарантий спина. Тир = редкость: 1 common … 5 legendary.
 * Гарантия «каждая N-я ≥ тир T»: каждая N-я крутка даёт номер тира T или выше.
 */

/** Гарантия, доступная всем с начала. */
export const BASE_GUARANTEE = { tier: 2, period: 10 } as const;

export const UPGRADE_IDS = ['p9', 'p8', 'p7', 't3', 't4', 't5'] as const;
export type UpgradeId = (typeof UPGRADE_IDS)[number];

export interface UpgradeDef {
  id: UpgradeId;
  /** Что нужно купить до этого апгрейда (null — достаточно базы). */
  requires: UpgradeId | null;
  cost: number;
  tier: number;
  period: number;
}

/** Ветка «период» — сокращает период базовой гарантии; ветка «порог» — открывает гарантии старших тиров. */
export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  p9: { id: 'p9', requires: null, cost: 5_000,   tier: 2, period: 9 },
  p8: { id: 'p8', requires: 'p9', cost: 15_000,  tier: 2, period: 8 },
  p7: { id: 'p7', requires: 'p8', cost: 40_000,  tier: 2, period: 7 },
  t3: { id: 't3', requires: null, cost: 8_000,   tier: 3, period: 50 },
  t4: { id: 't4', requires: 't3', cost: 30_000,  tier: 4, period: 200 },
  t5: { id: 't5', requires: 't4', cost: 100_000, tier: 5, period: 1000 }
};

export const UPGRADE_BRANCHES: UpgradeId[][] = [
  ['p9', 'p8', 'p7'],
  ['t3', 't4', 't5']
];

export interface Guarantee {
  tier: number;
  period: number;
}

/** Действующие гарантии: для каждого тира — минимальный период среди купленного. */
export function activeGuarantees(owned: Iterable<UpgradeId>): Guarantee[] {
  const best = new Map<number, number>([[BASE_GUARANTEE.tier, BASE_GUARANTEE.period]]);
  for (const id of owned) {
    const u = UPGRADES[id];
    best.set(u.tier, Math.min(best.get(u.tier) ?? Infinity, u.period));
  }
  return [...best].map(([tier, period]) => ({ tier, period })).sort((a, b) => a.tier - b.tier);
}
