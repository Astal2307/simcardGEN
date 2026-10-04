import { transaction, type DB } from '../db/database';
import type { GameCalendar } from '../domain/calendar';
import { Outbox, type Notifier } from '../domain/notifier';
import type { Rng } from '../domain/random';
import type { UsersRepo } from '../repositories/users';
import type { SimsRepo } from '../repositories/sims';
import type { LotsRepo } from '../repositories/lots';

/** Зависимости, общие для всех сервисов. */
export interface ServiceContext {
  db: DB;
  users: UsersRepo;
  sims: SimsRepo;
  lots: LotsRepo;
  rng: Rng;
  now: () => number;
  calendar: GameCalendar;
  notifier: Notifier;
}

/** Транзакция + отложенная отправка событий после коммита. */
export function unitOfWork<T>(ctx: ServiceContext, fn: (out: Outbox) => T, afterCommit?: (out: Outbox) => void): T {
  const out = new Outbox();
  const result = transaction(ctx.db, () => fn(out));
  out.flush(ctx.notifier);
  afterCommit?.(out);
  return result;
}
