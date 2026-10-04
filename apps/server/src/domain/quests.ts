import { QUEST_KINDS, QUESTS_PER_DAY, type QuestKind } from '@simrush/shared';
import { randInt, type Rng } from './random';

/** Варианты сложности задания: цель и награда. */
const POOL: Record<QuestKind, { target: number; reward: number }[]> = {
  spin:       [{ target: 3, reward: 600 }, { target: 5, reward: 1000 }, { target: 10, reward: 2000 }],
  spin_rare:  [{ target: 1, reward: 1500 }],
  bid:        [{ target: 3, reward: 500 }, { target: 5, reward: 800 }],
  win_lot:    [{ target: 1, reward: 1500 }],
  list_lot:   [{ target: 1, reward: 400 }],
  sell_lot:   [{ target: 1, reward: 1200 }],
  quick_sell: [{ target: 2, reward: 300 }, { target: 3, reward: 450 }]
};

export interface QuestDraft {
  kind: QuestKind;
  target: number;
  reward: number;
}

/** Набор заданий на день: разные виды, первое — всегда на спины. */
export function drawDailyQuests(rng: Rng): QuestDraft[] {
  const rest: QuestKind[] = QUEST_KINDS.filter(k => k !== 'spin');
  const kinds: QuestKind[] = ['spin'];
  while (kinds.length < QUESTS_PER_DAY) kinds.push(rest.splice(randInt(rng, rest.length), 1)[0]);
  return kinds.map(kind => {
    const variants = POOL[kind];
    return { kind, ...variants[randInt(rng, variants.length)] };
  });
}
