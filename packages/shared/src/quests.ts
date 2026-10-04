/** Ежедневные задания: виды и их названия (общие для клиента и сервера). */

export const QUEST_KINDS = ['spin', 'spin_rare', 'bid', 'win_lot', 'list_lot', 'sell_lot', 'quick_sell'] as const;
export type QuestKind = (typeof QUEST_KINDS)[number];

/** Сколько заданий выдаётся на день. */
export const QUESTS_PER_DAY = 3;

export const plural = (n: number, forms: [string, string, string]): string => {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return forms[1];
  return forms[2];
};

export function questTitle(kind: QuestKind, target: number): string {
  switch (kind) {
    case 'spin': return `Сделайте ${target} ${plural(target, ['спин', 'спина', 'спинов'])}`;
    case 'spin_rare': return 'Выбейте номер «Редкий» или выше';
    case 'bid': return `Сделайте ${target} ${plural(target, ['ставку', 'ставки', 'ставок'])} на аукционе`;
    case 'win_lot': return 'Выиграйте аукцион';
    case 'list_lot': return 'Выставьте номер на аукцион';
    case 'sell_lot': return 'Продайте номер на аукционе';
    case 'quick_sell': return `Продайте сразу ${target} ${plural(target, ['номер', 'номера', 'номеров'])}`;
  }
}
