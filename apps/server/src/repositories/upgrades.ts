import type { UpgradeId } from '@simrush/shared';
import type { DB } from '../db/database';

export class UpgradesRepo {
  constructor(private readonly db: DB) {}

  owned(userId: number): UpgradeId[] {
    const rows = this.db.prepare('SELECT upgrade_id FROM user_upgrades WHERE user_id = ?').all(userId) as { upgrade_id: UpgradeId }[];
    return rows.map(r => r.upgrade_id);
  }

  /** Записывает покупку; false — если апгрейд уже куплен. */
  add(userId: number, id: UpgradeId, now: number): boolean {
    const { changes } = this.db
      .prepare('INSERT OR IGNORE INTO user_upgrades (user_id, upgrade_id, bought_at) VALUES (?, ?, ?)')
      .run(userId, id, now);
    return Number(changes) === 1;
  }

  /** Счётчики круток по тирам. */
  pity(userId: number): Map<number, number> {
    const rows = this.db.prepare('SELECT tier, count FROM pity WHERE user_id = ?').all(userId) as { tier: number; count: number }[];
    return new Map(rows.map(r => [r.tier, r.count]));
  }

  setPity(userId: number, tier: number, count: number): void {
    this.db
      .prepare('INSERT INTO pity (user_id, tier, count) VALUES (?, ?, ?) ON CONFLICT (user_id, tier) DO UPDATE SET count = excluded.count')
      .run(userId, tier, count);
  }
}
