/** Мастерская: определение редкости по цифрам, правила крафта и колеса апгрейда. */
import { FIB_WINDOWS, REFS } from './album';
import { RARITIES, rarityRank, type Rarity } from './rarity';

const allSame = (ds: number[]) => ds.every(d => d === ds[0]);

/**
 * Редкость номера по узору хвоста (последние 7 цифр) — те же узоры, что выдаёт генератор:
 * legendary — 7 одинаковых; epic — лесенка, 6 одинаковых в конце, квадрат / 2ⁿ / Фибоначчи, отсылка;
 * rare — 4 одинаковых в конце, ABABAB, зеркало; uncommon — 3 одинаковых в конце, ABBA в конце.
 */
export function classifyRarity(digits: readonly number[]): Rarity {
  const t = digits.slice(3), s = t.join(''), n = Number(s);
  if (allSame(t)) return 'legendary';

  const ladder = t.every((x, i) => x === t[0] + i) || t.every((x, i) => x === t[0] - i);
  const r = Math.round(Math.sqrt(n));
  const math = (n >= 1_000_000 && r * r === n) || (n >= 1024 && (n & (n - 1)) === 0) || FIB_WINDOWS.includes(s);
  const ref = REFS.some(x => (x.prefix ? s.startsWith(x.digits) : s.endsWith(x.digits)));
  if (ladder || allSame(t.slice(1)) || math || ref) return 'epic';

  const abab = t[1] !== t[2] && t[1] === t[3] && t[3] === t[5] && t[2] === t[4] && t[4] === t[6];
  const mirror = t[0] === t[6] && t[1] === t[5] && t[2] === t[4];
  if (allSame(t.slice(3)) || abab || mirror) return 'rare';

  if (allSame(t.slice(4)) || (t[3] === t[6] && t[4] === t[5])) return 'uncommon';
  return 'common';
}

// --- крафт ---

export const CRAFT_BURN_COUNT = 3;

/**
 * Потолок крафта: номер не может быть (и стать) выше, чем на один тир над сожжёнными.
 * Проверяется и для выбора номера, и для результата замены цифры.
 */
export const canCraft = (burn: Rarity, target: Rarity) => rarityRank(target) <= rarityRank(burn) + 1;

// --- апгрейд ---

export const WHEEL_SECTORS = 40;

/** Число выигрышных секторов по разнице редкостей (желаемая − жертва). */
export function upgradeWinSectors(sacrifice: Rarity, desired: Rarity): number {
  const diff = rarityRank(desired) - rarityRank(sacrifice);
  if (diff <= -2) return 38;
  return ({ [-1]: 34, 0: 24, 1: 12, 2: 5, 3: 2, 4: 1 } as Record<number, number>)[diff];
}

/** Раскладка колеса: выигрышные сектора распределены равномерно. true — выигрыш. */
export function wheelLayout(win: number, total = WHEEL_SECTORS): boolean[] {
  return Array.from({ length: total }, (_, i) => Math.floor(((i + 1) * win) / total) > Math.floor((i * win) / total));
}

/** Номер для апгрейда: 10 цифр, первая — 9. */
export const isValidNumber = (d: unknown): d is number[] =>
  Array.isArray(d) && d.length === 10 && d[0] === 9 && d.every(x => Number.isInteger(x) && x >= 0 && x <= 9);

export const rarityAbove = (r: Rarity, by: number): Rarity | undefined => RARITIES[rarityRank(r) + by];
