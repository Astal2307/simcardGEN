import type { DB } from '../db/database';

export class AlbumRepo {
  constructor(private readonly db: DB) {}

  filled(userId: number): { collection: string; slot: string }[] {
    return this.db
      .prepare('SELECT collection_id AS collection, slot_key AS slot FROM album WHERE user_id = ? ORDER BY filled_at')
      .all(userId) as { collection: string; slot: string }[];
  }

  /** Закрывает ячейку; false — если она уже была закрыта. */
  fill(userId: number, collection: string, slot: string, simId: string, now: number): boolean {
    const { changes } = this.db
      .prepare('INSERT OR IGNORE INTO album (user_id, collection_id, slot_key, sim_id, filled_at) VALUES (?, ?, ?, ?, ?)')
      .run(userId, collection, slot, simId, now);
    return Number(changes) === 1;
  }

  claimed(userId: number): string[] {
    const rows = this.db.prepare('SELECT collection_id FROM album_rewards WHERE user_id = ?').all(userId) as { collection_id: string }[];
    return rows.map(r => r.collection_id);
  }

  /** Отмечает награду полученной; false — если уже получена. */
  markClaimed(userId: number, collection: string, now: number): boolean {
    const { changes } = this.db
      .prepare('INSERT OR IGNORE INTO album_rewards (user_id, collection_id, claimed_at) VALUES (?, ?, ?)')
      .run(userId, collection, now);
    return Number(changes) === 1;
  }

  countFilled(userId: number, collection: string): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS n FROM album WHERE user_id = ? AND collection_id = ?')
      .get(userId, collection) as { n: number };
    return row.n;
  }
}
