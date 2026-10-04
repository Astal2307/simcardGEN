import { randomUUID } from 'node:crypto';

/** Источник случайности в [0, 1). Подменяется в тестах. */
export type Rng = () => number;

export const defaultRng: Rng = Math.random;

export const randInt = (rng: Rng, n: number): number => Math.floor(rng() * n);
export const pick = <T>(rng: Rng, items: readonly T[]): T => items[randInt(rng, items.length)];

export const newId = (): string => randomUUID();
