/** Игровые правила, общие для клиента и сервера. */

export const SPIN_COST = 1000;
export const START_BALANCE = 10000;
export const TOPUP_AMOUNT = 5000;

/** Доля стоимости, которую платят за мгновенную продажу. */
export const INSTANT_SELL_RATE = 0.7;
/** Стартовая цена лота по умолчанию — доля стоимости. */
export const DEFAULT_LIST_RATE = 0.9;
/** Шаг ставки — доля стоимости номера. */
export const BID_STEP_RATE = 0.05;
/** Максимальная стартовая цена — во столько раз больше стоимости. */
export const MAX_LIST_MULTIPLIER = 20;

/** Длительность лота, выставленного игроком, в секундах. */
export const USER_LOT_DURATION_S = 25;
/** Если до конца меньше этого — ставка продлевает лот на столько же. */
export const ANTI_SNIPE_S = 6;

/** Ежедневный бонус: награда за 1-й…7-й день серии подряд. После 7-го дня даётся награда 7-го. */
export const DAILY_BONUS_REWARDS = [500, 750, 1000, 1500, 2000, 3000, 5000] as const;
export const DAILY_BONUS_MAX_DAY = DAILY_BONUS_REWARDS.length;
export const dailyBonusReward = (day: number): number =>
  DAILY_BONUS_REWARDS[Math.min(Math.max(day, 1), DAILY_BONUS_MAX_DAY) - 1];

export const round10 = (n: number): number => Math.max(10, Math.round(n / 10) * 10);
export const bidStep = (value: number): number => round10(value * BID_STEP_RATE);
export const instantSellPrice = (value: number): number => round10(value * INSTANT_SELL_RATE);
export const defaultListPrice = (value: number): number => round10(value * DEFAULT_LIST_RATE);

/** Цена следующей ставки: первая ставка принимает стартовую цену, дальше — +шаг. */
export const nextBid = (lot: { bid: number; step: number; bids: number }): number =>
  lot.bids === 0 ? lot.bid : lot.bid + lot.step;
