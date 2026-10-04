import type { QuestDTO, QuestKind } from '@simrush/shared';
import type { DB } from '../db/database';
import type { QuestDraft } from '../domain/quests';
import { newId } from '../domain/random';

export interface Quest {
  id: string;
  userId: number;
  day: number;
  kind: QuestKind;
  target: number;
  progress: number;
  reward: number;
  claimed: boolean;
}

interface QuestRow {
  id: string;
  user_id: number;
  day: number;
  kind: QuestKind;
  target: number;
  progress: number;
  reward: number;
  claimed: number;
}

const toQuest = (r: QuestRow): Quest => ({
  id: r.id, userId: r.user_id, day: r.day, kind: r.kind, target: r.target,
  progress: r.progress, reward: r.reward, claimed: r.claimed === 1
});

export const toQuestDTO = (q: Quest): QuestDTO => ({
  id: q.id, kind: q.kind, target: q.target, progress: q.progress, reward: q.reward, claimed: q.claimed
});

export class QuestsRepo {
  constructor(private readonly db: DB) {}

  listForDay(userId: number, day: number): Quest[] {
    const rows = this.db
      .prepare('SELECT * FROM quests WHERE user_id = ? AND day = ? ORDER BY slot')
      .all(userId, day) as unknown as QuestRow[];
    return rows.map(toQuest);
  }

  /** Создаёт задания дня и удаляет задания прошлых дней игрока. */
  replaceForDay(userId: number, day: number, drafts: QuestDraft[]): void {
    this.db.prepare('DELETE FROM quests WHERE user_id = ? AND day < ?').run(userId, day);
    const insert = this.db.prepare(
      'INSERT INTO quests (id, user_id, day, slot, kind, target, reward) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    drafts.forEach((d, slot) => insert.run(newId(), userId, day, slot, d.kind, d.target, d.reward));
  }

  /** Увеличивает прогресс незавершённого задания; возвращает обновлённое задание или undefined. */
  advance(userId: number, day: number, kind: QuestKind, amount: number): Quest | undefined {
    const row = this.db
      .prepare(
        `UPDATE quests SET progress = MIN(target, progress + ?)
         WHERE user_id = ? AND day = ? AND kind = ? AND progress < target
         RETURNING *`
      )
      .get(amount, userId, day, kind) as QuestRow | undefined;
    return row && toQuest(row);
  }

  findById(id: string): Quest | undefined {
    const row = this.db.prepare('SELECT * FROM quests WHERE id = ?').get(id) as QuestRow | undefined;
    return row && toQuest(row);
  }

  /** Отмечает награду полученной; false — если уже получена или задание не выполнено. */
  markClaimed(id: string): boolean {
    const { changes } = this.db
      .prepare('UPDATE quests SET claimed = 1 WHERE id = ? AND claimed = 0 AND progress >= target')
      .run(id);
    return Number(changes) === 1;
  }
}
