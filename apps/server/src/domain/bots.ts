import type { Rarity } from '@simrush/shared';

export const BOT_NAMES = [
  'kirill_77', 'Mara', 'dimon.sim', 'Ольга К.', 'zero_one', 'Влад',
  'nomernoy', 'Тимур', 'lena.v', '777boss', 'Арсен', 'grisha'
] as const;

/** Боты в рейтинге, чтобы таблица не была пустой. */
export const BOT_PLAYERS: { name: string; value: number; count: number; best: Rarity }[] = [
  { name: '777boss', value: 412300, count: 38, best: 'legendary' },
  { name: 'Mara', value: 268900, count: 51, best: 'legendary' },
  { name: 'kirill_77', value: 154200, count: 29, best: 'epic' },
  { name: 'Ольга К.', value: 98400, count: 44, best: 'epic' },
  { name: 'nomernoy', value: 61750, count: 22, best: 'epic' },
  { name: 'Тимур', value: 35900, count: 31, best: 'rare' },
  { name: 'zero_one', value: 18400, count: 17, best: 'rare' },
  { name: 'lena.v', value: 9650, count: 12, best: 'rare' },
  { name: 'dimon.sim', value: 4320, count: 9, best: 'uncommon' },
  { name: 'grisha', value: 1890, count: 6, best: 'uncommon' }
];

/** Параметры поведения ботов на аукционе (вероятности — на один тик в секунду). */
export const MARKET = {
  /** Сколько бот-лотов держать открытыми. */
  lotCount: 6,
  /** Длительность новых бот-лотов, сек. */
  minDurationS: 45,
  maxDurationS: 200,
  /** Время окончания стартовых лотов при пустой БД, сек. */
  seedDurationsS: [14, 48, 96, 141, 63, 178],
  /** Шанс, что бот перебьёт ставку на бот-лоте. */
  botBidOnMarketLot: 0.05,
  /** Шанс, что бот сделает ставку на лоте игрока. */
  botBidOnUserLot: 0.25
};
