import { DAYS_IN_MONTH, FIB_WINDOWS, OPERATOR_CODES, REFS, RARITIES, RARITY, round10, type Rarity } from '@simrush/shared';
import { randInt, type Rng } from './random';

export type RarityWeights = Record<Rarity, number>;

export const SPIN_WEIGHTS: RarityWeights = {
  common: RARITY.common.chance,
  uncommon: RARITY.uncommon.chance,
  rare: RARITY.rare.chance,
  epic: RARITY.epic.chance,
  legendary: RARITY.legendary.chance
};

/** Веса редкостей лотов, которые выставляют боты. */
export const MARKET_WEIGHTS: RarityWeights = { common: 26, uncommon: 30, rare: 24, epic: 14, legendary: 6 };

export function pickRarity(rng: Rng, weights: RarityWeights): Rarity {
  const total = RARITIES.reduce((a, k) => a + weights[k], 0);
  const x = rng() * total;
  let acc = 0;
  for (const k of RARITIES) {
    acc += weights[k];
    if (x < acc) return k;
  }
  return 'common';
}

const seq = (f: (i: number) => number): number[] => Array.from({ length: 7 }, (_, i) => f(i));

const digitsOf = (n: number): number[] => String(n).padStart(7, '0').split('').map(Number);

/** У обычного номера в хвосте не должно быть тройки и ABBA. */
const isPlainTail = (t: number[]) => !(t[4] === t[5] && t[5] === t[6]) && !(t[3] === t[6] && t[4] === t[5]);

/**
 * Генерирует 10 цифр номера (после +7) с узором, соответствующим редкости:
 * legendary — 7 одинаковых; epic — лесенка, 6 одинаковых, «математика» (квадрат, 2ⁿ, Фибоначчи) или «отсылка»;
 * rare — 4 одинаковых, ABABAB или зеркало; uncommon — 3 одинаковых, ABBA или круглый хвост;
 * common — без узоров, иногда дата ДД-ММ в конце.
 * Код чаще берётся из пула операторов (коллекция «Коды»).
 */
export function genDigits(rng: Rng, r: Rarity): number[] {
  const ri = (n: number) => randInt(rng, n);
  const code = rng() < 0.6 ? String(OPERATOR_CODES[ri(OPERATOR_CODES.length)]).split('').map(Number) : [9, ri(10), ri(10)];
  let tail: number[];
  if (r === 'legendary') {
    const d = ri(10);
    tail = seq(() => d);
    if (rng() < 0.4) { code[1] = d; code[2] = d; }
  } else if (r === 'epic') {
    const m = ri(4);
    if (m === 0) {
      const up = rng() < 0.5, s = up ? ri(4) : 6 + ri(4);
      tail = seq(i => (up ? s + i : s - i));
    } else if (m === 1) {
      const d = ri(10);
      tail = [(d + 1 + ri(9)) % 10, d, d, d, d, d, d];
    } else if (m === 2) {
      const k = ri(3);
      if (k === 0) { const n = 1000 + ri(2163); tail = digitsOf(n * n); }
      else if (k === 1) tail = digitsOf(2 ** (10 + ri(14)));
      else tail = FIB_WINDOWS[ri(FIB_WINDOWS.length)].split('').map(Number);
    } else {
      // «Отсылки»: число в конце хвоста (4815 — в начале, дальше продолжение 162)
      const ref = REFS[ri(REFS.length)];
      const s = ref.prefix ? (ref.digits + '162').slice(0, 7) : seq(() => ri(10)).join('').slice(0, 7 - ref.digits.length) + ref.digits;
      tail = s.split('').map(Number);
    }
  } else if (r === 'rare') {
    const m = ri(3);
    if (m === 0) { const d = ri(10); tail = [ri(10), ri(10), ri(10), d, d, d, d]; }
    else if (m === 1) { const a = ri(10), b = (a + 1 + ri(9)) % 10; tail = [ri(10), a, b, a, b, a, b]; }
    else { const a = ri(10), b = ri(10), c = ri(10); tail = [a, b, c, ri(10), c, b, a]; }
  } else if (r === 'uncommon') {
    const m = ri(3);
    if (m === 0) { const d = ri(10); tail = [ri(10), ri(10), ri(10), ri(10), d, d, d]; }
    else if (m === 1) { const a = ri(10), b = (a + 1 + ri(9)) % 10; tail = [ri(10), ri(10), ri(10), a, b, b, a]; }
    else tail = [ri(10), ri(10), ri(10), [0, 1, 5][ri(3)], 0, 0, 0];
  } else {
    tail = seq(() => ri(10));
    if (rng() < 0.15) {
      // дата ДД-ММ в конце хвоста, если она не образует узор
      for (let i = 0; i < 10; i++) {
        const month = 1 + ri(12), day = 1 + ri(DAYS_IN_MONTH[month - 1]);
        const t = [...tail.slice(0, 3), Math.floor(day / 10), day % 10, Math.floor(month / 10), month % 10];
        if (isPlainTail(t)) { tail = t; break; }
      }
    }
    if (tail[4] === tail[5] && tail[5] === tail[6]) tail[6] = (tail[6] + 1) % 10;
    if (tail[3] === tail[6] && tail[4] === tail[5]) tail[5] = (tail[5] + 3) % 10;
  }
  return code.concat(tail);
}

export const rollValue = (rng: Rng, r: Rarity): number => round10(RARITY[r].base * (0.85 + rng() * 0.45));
