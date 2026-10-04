import { RARITIES, type Rarity, type SimDTO } from '@simrush/shared';
import type { DB } from '../db/database';

export type SimStatus = 'owned' | 'listed' | 'gone';

export interface Sim {
  id: string;
  ownerId: number | null;
  digits: number[];
  rarity: Rarity;
  value: number;
  status: SimStatus;
}

export interface SimRow {
  id: string;
  owner_id: number | null;
  digits: string;
  rarity: Rarity;
  value: number;
  status: SimStatus;
}

export const toSim = (r: SimRow): Sim => ({
  id: r.id,
  ownerId: r.owner_id,
  digits: [...r.digits].map(Number),
  rarity: r.rarity,
  value: r.value,
  status: r.status
});

export const toSimDTO = (s: Pick<Sim, 'id' | 'digits' | 'rarity' | 'value'>): SimDTO => ({
  id: s.id, digits: s.digits, rarity: s.rarity, value: s.value
});

export interface OwnerStats {
  ownerId: number;
  name: string;
  value: number;
  count: number;
  best: Rarity;
}

// ранг редкости вычисляем в SQL, чтобы найти лучшую одним запросом
const RANK_CASE = `CASE s.rarity ${RARITIES.map((r, i) => `WHEN '${r}' THEN ${i}`).join(' ')} ELSE 0 END`;

export class SimsRepo {
  constructor(private readonly db: DB) {}

  insert(sim: Omit<Sim, 'status' | 'ownerId'>, ownerId: number | null, status: SimStatus, now: number): Sim {
    this.db
      .prepare('INSERT INTO sims (id, owner_id, digits, rarity, value, status, acquired_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(sim.id, ownerId, sim.digits.join(''), sim.rarity, sim.value, status, now);
    return { ...sim, ownerId, status };
  }

  findById(id: string): Sim | undefined {
    const row = this.db.prepare('SELECT * FROM sims WHERE id = ?').get(id) as SimRow | undefined;
    return row && toSim(row);
  }

  /** Коллекция игрока, новые сверху. */
  listOwned(ownerId: number): Sim[] {
    const rows = this.db
      .prepare("SELECT * FROM sims WHERE owner_id = ? AND status = 'owned' ORDER BY acquired_at DESC, rowid DESC")
      .all(ownerId) as unknown as SimRow[];
    return rows.map(toSim);
  }

  /** Передаёт номер владельцу (или «в никуда» при ownerId = null) и меняет статус. */
  transfer(id: string, ownerId: number | null, status: SimStatus, now: number): void {
    this.db.prepare('UPDATE sims SET owner_id = ?, status = ?, acquired_at = ? WHERE id = ?').run(ownerId, status, now, id);
  }

  /** Перезаписывает цифры номера (крафт) вместе с пересчитанными редкостью и стоимостью. */
  updateDigits(id: string, digits: number[], rarity: Rarity, value: number): void {
    this.db.prepare('UPDATE sims SET digits = ?, rarity = ?, value = ? WHERE id = ?').run(digits.join(''), rarity, value, id);
  }

  setStatus(id: string, status: SimStatus): void {
    this.db.prepare('UPDATE sims SET status = ? WHERE id = ?').run(status, id);
  }

  /** Стоимость, количество и лучшая редкость коллекций (номера на аукционе тоже считаются). */
  ownerStats(): OwnerStats[] {
    const rows = this.db
      .prepare(
        `SELECT u.id AS ownerId, u.name AS name, SUM(s.value) AS value, COUNT(*) AS count, MAX(${RANK_CASE}) AS bestRank
         FROM sims s JOIN users u ON u.id = s.owner_id
         WHERE s.status IN ('owned', 'listed')
         GROUP BY u.id`
      )
      .all() as unknown as { ownerId: number; name: string; value: number; count: number; bestRank: number }[];
    return rows.map(r => ({ ownerId: r.ownerId, name: r.name, value: r.value, count: r.count, best: RARITIES[r.bestRank] }));
  }
}
