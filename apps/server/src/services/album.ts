import { ALBUM_BY_ID, albumMatches, type AlbumDTO, type AlbumHitDTO, type ClaimAlbumResponse } from '@simrush/shared';
import { DomainError, notFound } from '../domain/errors';
import type { AlbumRepo } from '../repositories/album';
import { unitOfWork, type ServiceContext } from './context';

/** Коллекции номеров: ячейку закрывает первый подходящий номер игрока. */
export class AlbumService {
  constructor(
    private readonly ctx: ServiceContext,
    private readonly repo: AlbumRepo
  ) {}

  state(userId: number): AlbumDTO {
    return { filled: this.repo.filled(userId), claimed: this.repo.claimed(userId) };
  }

  /** Награда за полностью собранную коллекцию — один раз. */
  claim(userId: number, collection: string): ClaimAlbumResponse {
    return unitOfWork(this.ctx, out => {
      const def = ALBUM_BY_ID[collection];
      if (!def) throw notFound('Коллекция');
      if (this.repo.countFilled(userId, collection) < def.slots.length) {
        throw new DomainError('ALBUM_NOT_COMPLETE', 'Коллекция ещё не собрана');
      }
      if (!this.repo.markClaimed(userId, collection, this.ctx.now())) {
        throw new DomainError('ALBUM_CLAIMED', 'Награда уже получена');
      }
      const balance = this.ctx.users.adjustBalance(userId, def.reward)!;
      out.toUser(userId, 'balance', { balance });
      return { balance, reward: def.reward };
    });
  }

  /**
   * Засчитывает номер, полученный игроком. Возвращает только новые ячейки.
   * Вызывается внутри транзакции получения номера.
   */
  register(userId: number, sim: { id: string; digits: number[] }): AlbumHitDTO[] {
    const now = this.ctx.now();
    return albumMatches(sim.digits)
      .filter(m => this.repo.fill(userId, m.collection, m.slot, sim.id, now))
      .map(m => ({
        ...m,
        filled: this.repo.countFilled(userId, m.collection),
        total: ALBUM_BY_ID[m.collection].slots.length
      }));
  }
}
