import type { DB } from '../db/database';

export interface User {
  id: number;
  token: string;
  name: string;
  balance: number;
  tutorial: number;
}

export interface BonusState {
  /** День серии последнего получения (0 — ни разу). */
  streak: number;
  /** Номер игрового дня последнего получения. */
  lastDay: number | null;
}

interface UserRow {
  id: number;
  token: string;
  name: string;
  balance: number;
  tutorial_step: number;
}

const toUser = (r: UserRow): User => ({ id: r.id, token: r.token, name: r.name, balance: r.balance, tutorial: r.tutorial_step });

export class UsersRepo {
  constructor(private readonly db: DB) {}

  create(token: string, balance: number, now: number): User {
    const { lastInsertRowid } = this.db
      .prepare('INSERT INTO users (token, name, balance, created_at, tutorial_step, free_upgrade) VALUES (?, ?, ?, ?, 0, 1)')
      .run(token, '', balance, now);
    const id = Number(lastInsertRowid);
    const name = `Игрок ${id}`;
    this.db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, id);
    return { id, token, name, balance, tutorial: 0 };
  }

  findByToken(token: string): User | undefined {
    const row = this.db.prepare('SELECT * FROM users WHERE token = ?').get(token) as UserRow | undefined;
    return row && toUser(row);
  }

  findById(id: number): User | undefined {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
    return row && toUser(row);
  }

  /** Тратит гарантированный первый апгрейд; true — если он был. */
  useFreeUpgrade(id: number): boolean {
    const { changes } = this.db.prepare('UPDATE users SET free_upgrade = 0 WHERE id = ? AND free_upgrade = 1').run(id);
    return Number(changes) === 1;
  }

  setTutorial(id: number, step: number): void {
    this.db.prepare('UPDATE users SET tutorial_step = ? WHERE id = ?').run(step, id);
  }

  getBonus(id: number): BonusState | undefined {
    const row = this.db.prepare('SELECT bonus_streak, bonus_last_day FROM users WHERE id = ?').get(id) as
      | { bonus_streak: number; bonus_last_day: number | null }
      | undefined;
    return row && { streak: row.bonus_streak, lastDay: row.bonus_last_day };
  }

  /** Отмечает получение бонуса; не сработает, если за этот день он уже получен. */
  markBonusClaimed(id: number, streak: number, day: number): boolean {
    const { changes } = this.db
      .prepare('UPDATE users SET bonus_streak = ?, bonus_last_day = ? WHERE id = ? AND (bonus_last_day IS NULL OR bonus_last_day < ?)')
      .run(streak, day, id, day);
    return Number(changes) === 1;
  }

  /** Атомарно меняет баланс. Возвращает новый баланс или null, если средств не хватает. */
  adjustBalance(id: number, delta: number): number | null {
    const row = this.db
      .prepare('UPDATE users SET balance = balance + ? WHERE id = ? AND balance + ? >= 0 RETURNING balance')
      .get(delta, id, delta) as { balance: number } | undefined;
    return row ? row.balance : null;
  }
}
