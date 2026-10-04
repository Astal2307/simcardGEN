import type { Rarity } from '@simrush/shared';
import { genDigits, rollValue } from './generator';
import { newId, type Rng } from './random';

export interface NewSim {
  id: string;
  digits: number[];
  rarity: Rarity;
  value: number;
}

export const createSim = (rng: Rng, rarity: Rarity): NewSim => ({
  id: newId(),
  digits: genDigits(rng, rarity),
  rarity,
  value: rollValue(rng, rarity)
});
