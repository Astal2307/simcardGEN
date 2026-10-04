import { describe, expect, it } from 'vitest';
import { albumMatches, RARITIES } from '@simrush/shared';
import { genDigits, pickRarity, SPIN_WEIGHTS } from '../src/domain/generator';

const N = 500;
const tail = (d: number[]) => d.slice(3);

describe('genDigits', () => {
  it('всегда 10 цифр и код начинается с 9', () => {
    for (const r of RARITIES) {
      for (let i = 0; i < 50; i++) {
        const d = genDigits(Math.random, r);
        expect(d).toHaveLength(10);
        expect(d[0]).toBe(9);
        d.forEach(x => expect(x).toBeGreaterThanOrEqual(0));
        d.forEach(x => expect(x).toBeLessThan(10));
      }
    }
  });

  it('legendary — семь одинаковых цифр', () => {
    for (let i = 0; i < N; i++) expect(new Set(tail(genDigits(Math.random, 'legendary'))).size).toBe(1);
  });

  it('epic — лесенка, шесть одинаковых, математика или отсылка', () => {
    for (let i = 0; i < N; i++) {
      const d = genDigits(Math.random, 'epic');
      const t = tail(d);
      const six = new Set(t.slice(1)).size === 1;
      const hits = albumMatches(d).map(h => h.collection + ':' + h.slot);
      const ladder = hits.some(h => h.startsWith('ladders:'));
      const math = hits.some(h => ['math:sq', 'math:pow2', 'math:fib'].includes(h));
      const ref = hits.some(h => h.startsWith('refs:'));
      expect(ladder || six || math || ref).toBe(true);
    }
  });

  it('rare — четыре одинаковых, ABABAB или зеркало', () => {
    for (let i = 0; i < N; i++) {
      const d = genDigits(Math.random, 'rare');
      const t = tail(d);
      const four = new Set(t.slice(3)).size === 1;
      const hits = albumMatches(d).map(h => h.collection);
      expect(four || hits.includes('blocks') || hits.includes('mirrors')).toBe(true);
    }
  });

  it('новые узоры реально выпадают', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      for (const r of ['common', 'uncommon', 'rare', 'epic'] as const) {
        albumMatches(genDigits(Math.random, r)).forEach(h => seen.add(h.collection));
      }
    }
    for (const c of ['pairs', 'round', 'codes', 'triples', 'ladders', 'mirrors', 'blocks', 'dates', 'twodigit', 'math', 'refs']) {
      expect(seen.has(c)).toBe(true);
    }
  });

  it('common — без тройки и без ABBA в хвосте', () => {
    for (let i = 0; i < N; i++) {
      const t = tail(genDigits(Math.random, 'common'));
      expect(t[4] === t[5] && t[5] === t[6]).toBe(false);
      expect(t[3] === t[6] && t[4] === t[5]).toBe(false);
    }
  });
});

describe('pickRarity', () => {
  it('границы распределения', () => {
    expect(pickRarity(() => 0, SPIN_WEIGHTS)).toBe('common');
    expect(pickRarity(() => 0.999, SPIN_WEIGHTS)).toBe('legendary');
    expect(pickRarity(() => 0.69, SPIN_WEIGHTS)).toBe('uncommon');
  });
});
