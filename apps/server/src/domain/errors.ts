import type { ErrorCode } from '@simrush/shared';

const STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  INSUFFICIENT_FUNDS: 409,
  LOT_CLOSED: 409,
  OWN_LOT: 409,
  ALREADY_LEADER: 409,
  HAS_BIDS: 409,
  BONUS_CLAIMED: 409,
  QUEST_NOT_DONE: 409,
  QUEST_CLAIMED: 409,
  UPGRADE_OWNED: 409,
  UPGRADE_LOCKED: 409,
  ALBUM_NOT_COMPLETE: 409,
  ALBUM_CLAIMED: 409,
  INTERNAL: 500
};

export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
    this.status = STATUS[code];
  }
}

export const notFound = (what: string) => new DomainError('NOT_FOUND', `${what} не найден`);
export const insufficientFunds = () => new DomainError('INSUFFICIENT_FUNDS', 'Недостаточно монет');
