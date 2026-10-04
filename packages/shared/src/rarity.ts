export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type Rarity = (typeof RARITIES)[number];

export interface RarityInfo {
  name: string;
  color: string;
  /** Базовая стоимость номера этой редкости. */
  base: number;
  /** Шанс выпадения при спине, в процентах. */
  chance: number;
}

export const RARITY: Record<Rarity, RarityInfo> = {
  common:    { name: 'Обычный',     color: '#9AA0A8', base: 70,    chance: 68 },
  uncommon:  { name: 'Необычный',   color: '#5BC98A', base: 650,   chance: 22 },
  rare:      { name: 'Редкий',      color: '#4C8DFF', base: 2600,  chance: 7 },
  epic:      { name: 'Эпический',   color: '#A66BFF', base: 12000, chance: 2.5 },
  legendary: { name: 'Легендарный', color: '#F5B83D', base: 52000, chance: 0.5 }
};

export const isRarity = (v: unknown): v is Rarity => RARITIES.includes(v as Rarity);
export const rarityRank = (r: Rarity): number => RARITIES.indexOf(r);
