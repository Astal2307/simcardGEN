/** Контракт HTTP API и событий реального времени. */
import type { QuestKind } from './quests';
import type { Rarity } from './rarity';
import type { UpgradeId } from './upgrades';

export interface SimDTO {
  id: string;
  /** 10 цифр номера после +7. */
  digits: number[];
  rarity: Rarity;
  value: number;
}

export interface UserDTO {
  id: number;
  name: string;
  balance: number;
  /** Шаг обучения; TUTORIAL_DONE — пройдено или пропущено. */
  tutorial: number;
}

export const TUTORIAL_DONE = -1;

export interface LotDTO {
  id: string;
  sim: SimDTO;
  bid: number;
  step: number;
  bids: number;
  /** Unix-время окончания, мс (по часам сервера). */
  endsAt: number;
  seller: { id: number | null; name: string };
  leaderId: number | null;
}

export interface LotsSnapshot {
  serverTime: number;
  lots: LotDTO[];
}

export type LeaderboardMetric = 'value' | 'count';

export interface LeaderboardEntry {
  name: string;
  value: number;
  count: number;
  best: Rarity;
  me: boolean;
}

export interface LeaderboardDTO {
  entries: LeaderboardEntry[];
  myRank: number;
  me: LeaderboardEntry;
}

export interface DailyBonusDTO {
  /** День серии (1…7): доступный сейчас или уже забранный сегодня. */
  day: number;
  claimedToday: boolean;
  /** Начало следующего игрового дня, мс (по часам сервера). */
  nextAt: number;
}

export interface QuestDTO {
  id: string;
  kind: QuestKind;
  target: number;
  progress: number;
  reward: number;
  claimed: boolean;
}

export interface QuestsDTO {
  quests: QuestDTO[];
  /** Когда задания обновятся (начало следующего игрового дня), мс. */
  nextAt: number;
}

/** Счётчик гарантии: сколько круток прошло из периода. */
export interface PityDTO {
  tier: number;
  count: number;
  period: number;
}

/** Новая ячейка коллекции, закрытая номером. */
export interface AlbumHitDTO {
  collection: string;
  slot: string;
  /** Сколько ячеек коллекции закрыто после этого номера. */
  filled: number;
  total: number;
}

export interface AlbumDTO {
  filled: { collection: string; slot: string }[];
  /** Коллекции, награда за которые уже получена. */
  claimed: string[];
}

export interface UpgradesDTO {
  owned: UpgradeId[];
  pity: PityDTO[];
}

// --- запросы / ответы ---

export interface SessionResponse { token: string; user: UserDTO }
export interface SpinRequest { rarity?: Rarity }
export interface SpinResponse { sim: SimDTO; balance: number; pity: PityDTO[]; album: AlbumHitDTO[] }
export interface BalanceResponse { balance: number }
export interface TutorialRequest { step: number }
export interface SellResponse { balance: number; amount: number }
export interface SellManyRequest { ids: string[] }
/** sold — сколько номеров реально продано (остальные уже не в инвентаре). */
export interface SellManyResponse { balance: number; amount: number; sold: number }
export interface ListRequest { startPrice: number }
export interface ListResponse { lot: LotDTO }
export interface BidResponse { balance: number; lot: LotDTO }
export interface ClaimBonusResponse { balance: number; reward: number; bonus: DailyBonusDTO }
/** Цифру на выбранной позиции выбирает сервер случайно. */
export interface CraftRequest { targetId: string; burnIds: string[]; position: number }
export interface CraftResponse { sim: SimDTO; album: AlbumHitDTO[] }
export interface UpgradeRequest { sacrificeId: string; digits: number[] }
/** sector — сектор колеса, на котором остановилась стрелка. */
export interface UpgradeResponse { win: boolean; sector: number; sim: SimDTO | null; album: AlbumHitDTO[] }
export interface ClaimAlbumResponse { balance: number; reward: number }
export interface BuyUpgradeResponse { balance: number; upgrades: UpgradesDTO }
export interface ClaimQuestResponse { balance: number; reward: number; quests: QuestsDTO }

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'INSUFFICIENT_FUNDS'
  | 'LOT_CLOSED'
  | 'OWN_LOT'
  | 'ALREADY_LEADER'
  | 'HAS_BIDS'
  | 'BONUS_CLAIMED'
  | 'QUEST_NOT_DONE'
  | 'QUEST_CLAIMED'
  | 'UPGRADE_OWNED'
  | 'UPGRADE_LOCKED'
  | 'ALBUM_NOT_COMPLETE'
  | 'ALBUM_CLAIMED'
  | 'INTERNAL';

export interface ErrorResponse { error: ErrorCode; message: string }

// --- события SSE (/api/events) ---

export type Notice =
  | { kind: 'outbid'; digits: number[]; rarity: Rarity }
  | { kind: 'won'; digits: number[]; rarity: Rarity }
  | { kind: 'sold'; amount: number }
  | { kind: 'unsold'; digits: number[] }
  | { kind: 'quest_done'; quest: QuestKind; target: number };

export interface ServerEvents {
  lots: LotsSnapshot;
  balance: BalanceResponse;
  collection: Record<string, never>;
  notice: Notice;
  quests: QuestsDTO;
}

export type ServerEventName = keyof ServerEvents;
