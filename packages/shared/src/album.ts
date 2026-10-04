/**
 * Коллекции номеров («альбом»). Номер = код (3 цифры) + хвост (7 цифр).
 * Каждая коллекция — набор ячеек; ячейку закрывает первый подходящий номер.
 */

export type AlbumGroup = 'simple' | 'medium' | 'rare';

export const ALBUM_GROUPS: { id: AlbumGroup; name: string; rarity: 'uncommon' | 'rare' | 'legendary' }[] = [
  { id: 'simple', name: 'Простые', rarity: 'uncommon' },
  { id: 'medium', name: 'Средние', rarity: 'rare' },
  { id: 'rare', name: 'Редкие', rarity: 'legendary' }
];

export interface AlbumSlot {
  key: string;
  label: string;
}

export interface AlbumDef {
  id: string;
  name: string;
  group: AlbumGroup;
  /** Колонок в сетке ячеек. */
  cols: number;
  /** Награда за полностью собранную коллекцию. */
  reward: number;
  slots: AlbumSlot[];
  /** Ключи ячеек, которые закрывает номер. */
  match(code: number[], tail: number[]): string[];
}

/** Коды операторов для коллекции «Коды» (генератор чаще выдаёт их). */
export const OPERATOR_CODES = [900, 903, 905, 910, 912, 916, 925, 950, 977, 999];

const D = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
export const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const num = (ds: number[]) => ds.reduce((a, d) => a * 10 + d, 0);
const allSame = (ds: number[]) => ds.every(d => d === ds[0]);

function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
  return true;
}

/** Окна из 7 цифр, начинающиеся на границе числа в записи 0 1 1 2 3 5 8 13 21 … подряд. */
export const FIB_WINDOWS: string[] = (() => {
  const fib = [0, 1];
  while (fib.length < 30) fib.push(fib[fib.length - 1] + fib[fib.length - 2]);
  const s = fib.join('');
  const out: string[] = [];
  let pos = 0;
  for (const f of fib) {
    if (pos + 7 <= s.length) out.push(s.slice(pos, pos + 7));
    pos += String(f).length;
  }
  return [...new Set(out)].slice(0, 12);
})();

/** «Отсылки»: хвост заканчивается на число; 4815 — начинается (весь 4815162342 не влезает). */
export const REFS: { key: string; label: string; digits: string; prefix?: boolean }[] = [
  { key: '1337', label: '1337', digits: '1337' },
  { key: '228', label: '228', digits: '228' },
  { key: '314159', label: '314159', digits: '314159' },
  { key: '0451', label: '0451', digits: '0451' },
  { key: '4815', label: '4815…', digits: '4815', prefix: true }
];

export const ALBUMS: AlbumDef[] = [
  {
    id: 'pairs', name: 'Пары', group: 'simple', cols: 5, reward: 3_000,
    slots: D.map(d => ({ key: String(d), label: `${d}${d}` })),
    match: (_, t) => (t[5] === t[6] ? [String(t[6])] : [])
  },
  {
    id: 'round', name: 'Круглые', group: 'simple', cols: 3, reward: 2_000,
    slots: [0, 1, 5].map(x => ({ key: String(x), label: `${x}0-00` })),
    match: (_, t) => (t[4] === 0 && t[5] === 0 && t[6] === 0 && [0, 1, 5].includes(t[3]) ? [String(t[3])] : [])
  },
  {
    id: 'codes', name: 'Коды', group: 'simple', cols: 5, reward: 3_000,
    slots: OPERATOR_CODES.map(c => ({ key: String(c), label: String(c) })),
    match: c => (OPERATOR_CODES.includes(num(c)) ? [String(num(c))] : [])
  },
  {
    id: 'triples', name: 'Тройки', group: 'medium', cols: 5, reward: 8_000,
    slots: D.map(d => ({ key: String(d), label: `${d}${d}${d}` })),
    match: (_, t) => (t[4] === t[5] && t[5] === t[6] ? [String(t[6])] : [])
  },
  {
    id: 'ladders', name: 'Лесенки', group: 'medium', cols: 4, reward: 15_000,
    slots: [
      ...[0, 1, 2, 3].map(s => ({ key: 'u' + s, label: D.slice(s, s + 7).join('') })),
      ...[9, 8, 7, 6].map(s => ({ key: 'd' + s, label: D.slice(s - 6, s + 1).reverse().join('') }))
    ],
    match: (_, t) => {
      if (t.every((x, i) => x === t[0] + i)) return ['u' + t[0]];
      if (t.every((x, i) => x === t[0] - i)) return ['d' + t[0]];
      return [];
    }
  },
  {
    id: 'mirrors', name: 'Зеркала', group: 'medium', cols: 5, reward: 10_000,
    slots: D.map(d => ({ key: String(d), label: `·${d}·` })),
    match: (_, t) => (t[0] === t[6] && t[1] === t[5] && t[2] === t[4] ? [String(t[3])] : [])
  },
  {
    id: 'blocks', name: 'Повторы XY', group: 'medium', cols: 5, reward: 10_000,
    slots: D.map(d => ({ key: String(d), label: `${d}Y` })),
    match: (_, t) => (t[1] !== t[2] && t[1] === t[3] && t[3] === t[5] && t[2] === t[4] && t[4] === t[6] ? [String(t[1])] : [])
  },
  {
    id: 'dates', name: 'Даты', group: 'medium', cols: 4, reward: 8_000,
    slots: MONTHS.map((m, i) => ({ key: String(i + 1), label: m })),
    match: (_, t) => {
      const day = t[3] * 10 + t[4], month = t[5] * 10 + t[6];
      return month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN_MONTH[month - 1] ? [String(month)] : [];
    }
  },
  {
    id: 'monolith', name: 'Монолит', group: 'rare', cols: 5, reward: 100_000,
    slots: D.map(d => ({ key: String(d), label: `${d}×7` })),
    match: (_, t) => (allSame(t) ? [String(t[0])] : [])
  },
  {
    id: 'tone', name: 'Код в тон', group: 'rare', cols: 5, reward: 150_000,
    slots: D.map(d => ({ key: String(d), label: `9${d}${d}` })),
    match: (c, t) => (c[1] === c[2] && allSame(t) && t[0] === c[1] ? [String(c[1])] : [])
  },
  {
    id: 'twodigit', name: 'Две цифры', group: 'rare', cols: 5, reward: 40_000,
    slots: D.map(d => ({ key: String(d), label: `${d}+X` })),
    match: (_, t) => {
      if (new Set(t).size !== 2) return [];
      const major = D.find(d => t.filter(x => x === d).length >= 4)!;
      return [String(major)];
    }
  },
  {
    id: 'math', name: 'Математика', group: 'rare', cols: 2, reward: 50_000,
    slots: [
      { key: 'sq', label: 'Квадрат' },
      { key: 'prime', label: 'Простое' },
      { key: 'pow2', label: 'Степень 2' },
      { key: 'fib', label: 'Фибоначчи' }
    ],
    match: (_, t) => {
      const n = num(t), keys: string[] = [];
      const r = Math.round(Math.sqrt(n));
      if (n > 0 && r * r === n) keys.push('sq');
      if (isPrime(n)) keys.push('prime');
      if (n > 0 && (n & (n - 1)) === 0) keys.push('pow2');
      if (FIB_WINDOWS.includes(t.join(''))) keys.push('fib');
      return keys;
    }
  },
  {
    id: 'refs', name: 'Отсылки', group: 'rare', cols: 3, reward: 60_000,
    slots: REFS.map(r => ({ key: r.key, label: r.label })),
    match: (_, t) => {
      const s = t.join('');
      return REFS.filter(r => (r.prefix ? s.startsWith(r.digits) : s.endsWith(r.digits))).map(r => r.key);
    }
  }
];

export const ALBUM_BY_ID: Record<string, AlbumDef> = Object.fromEntries(ALBUMS.map(a => [a.id, a]));

/** Все ячейки, которые закрывает номер (10 цифр после +7). */
export function albumMatches(digits: readonly number[]): { collection: string; slot: string }[] {
  const code = digits.slice(0, 3), tail = digits.slice(3);
  return ALBUMS.flatMap(a => a.match(code, tail).map(slot => ({ collection: a.id, slot })));
}
