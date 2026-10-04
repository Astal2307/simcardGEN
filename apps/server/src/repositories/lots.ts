import type { LotDTO } from '@simrush/shared';
import type { DB } from '../db/database';
import { toSim, toSimDTO, type Sim, type SimRow } from './sims';

export type LotStatus = 'open' | 'closed';

export interface Lot {
  id: string;
  simId: string;
  sellerId: number | null;
  sellerName: string;
  bid: number;
  step: number;
  bids: number;
  leaderId: number | null;
  leaderName: string | null;
  endsAt: number;
  status: LotStatus;
}

export interface LotWithSim extends Lot {
  sim: Sim;
}

interface LotRow {
  id: string;
  sim_id: string;
  seller_id: number | null;
  seller_name: string;
  bid: number;
  step: number;
  bids: number;
  leader_id: number | null;
  leader_name: string | null;
  ends_at: number;
  status: LotStatus;
}

const toLot = (r: LotRow): Lot => ({
  id: r.id,
  simId: r.sim_id,
  sellerId: r.seller_id,
  sellerName: r.seller_name,
  bid: r.bid,
  step: r.step,
  bids: r.bids,
  leaderId: r.leader_id,
  leaderName: r.leader_name,
  endsAt: r.ends_at,
  status: r.status
});

export const toLotDTO = (l: LotWithSim): LotDTO => ({
  id: l.id,
  sim: toSimDTO(l.sim),
  bid: l.bid,
  step: l.step,
  bids: l.bids,
  endsAt: l.endsAt,
  seller: { id: l.sellerId, name: l.sellerName },
  leaderId: l.leaderId
});

const WITH_SIM = `
  SELECT l.*, s.id AS s_id, s.owner_id AS s_owner_id, s.digits AS s_digits, s.rarity AS s_rarity,
         s.value AS s_value, s.status AS s_status
  FROM lots l JOIN sims s ON s.id = l.sim_id`;

type JoinedRow = LotRow & { [K in keyof SimRow as `s_${K}`]: SimRow[K] };

const toLotWithSim = (r: JoinedRow): LotWithSim => ({
  ...toLot(r),
  sim: toSim({ id: r.s_id, owner_id: r.s_owner_id, digits: r.s_digits, rarity: r.s_rarity, value: r.s_value, status: r.s_status })
});

export class LotsRepo {
  constructor(private readonly db: DB) {}

  insert(lot: Omit<Lot, 'status'>, now: number): Lot {
    this.db
      .prepare(
        `INSERT INTO lots (id, sim_id, seller_id, seller_name, bid, step, bids, leader_id, leader_name, ends_at, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`
      )
      .run(lot.id, lot.simId, lot.sellerId, lot.sellerName, lot.bid, lot.step, lot.bids, lot.leaderId, lot.leaderName, lot.endsAt, now);
    return { ...lot, status: 'open' };
  }

  findById(id: string): LotWithSim | undefined {
    const row = this.db.prepare(`${WITH_SIM} WHERE l.id = ?`).get(id) as JoinedRow | undefined;
    return row && toLotWithSim(row);
  }

  listOpen(): LotWithSim[] {
    const rows = this.db.prepare(`${WITH_SIM} WHERE l.status = 'open' ORDER BY l.ends_at`).all() as unknown as JoinedRow[];
    return rows.map(toLotWithSim);
  }

  countOpenMarketLots(): number {
    const row = this.db.prepare("SELECT COUNT(*) AS n FROM lots WHERE status = 'open' AND seller_id IS NULL").get() as { n: number };
    return row.n;
  }

  /** Сохраняет изменяемые поля лота. */
  save(lot: Lot): void {
    this.db
      .prepare('UPDATE lots SET bid = ?, bids = ?, leader_id = ?, leader_name = ?, ends_at = ?, status = ? WHERE id = ?')
      .run(lot.bid, lot.bids, lot.leaderId, lot.leaderName, lot.endsAt, lot.status, lot.id);
  }
}
