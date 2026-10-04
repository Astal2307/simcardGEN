import {
  canCraft, classifyRarity, CRAFT_BURN_COUNT, isValidNumber, upgradeWinSectors, WHEEL_SECTORS, wheelLayout,
  type CraftResponse, type UpgradeResponse
} from '@simrush/shared';
import { DomainError } from '../domain/errors';
import { rollValue } from '../domain/generator';
import { newId, randInt } from '../domain/random';
import { toSimDTO } from '../repositories/sims';
import type { AlbumService } from './album';
import type { CollectionService } from './collection';
import { unitOfWork, type ServiceContext } from './context';

const bad = (message: string) => new DomainError('BAD_REQUEST', message);

/** Мастерская: крафт (замена цифры за три сожжённых номера) и апгрейд на колесе. */
export class WorkshopService {
  constructor(
    private readonly ctx: ServiceContext,
    private readonly collection: CollectionService,
    private readonly album: AlbumService
  ) {}

  /**
   * Сжигает три номера одной редкости и меняет одну цифру в четвёртом на случайную.
   * Цифры, которые подняли бы номер выше потолка (тир сожжённых + 1), в розыгрыш не входят.
   * Редкость изменённого номера определяется заново по узору.
   */
  craft(userId: number, targetId: string, burnIds: string[], position: number): CraftResponse {
    const { sims, rng } = this.ctx;
    return unitOfWork(this.ctx, () => {
      if (new Set(burnIds).size !== CRAFT_BURN_COUNT || burnIds.includes(targetId)) throw bad('Нужно три разных номера');
      if (!Number.isInteger(position) || position < 1 || position > 9) throw bad('Эту цифру менять нельзя');

      const target = this.collection.ownedSim(userId, targetId);
      const burns = burnIds.map(id => this.collection.ownedSim(userId, id));
      const burnRarity = burns[0].rarity;
      if (burns.some(b => b.rarity !== burnRarity)) throw bad('Сжигаемые номера должны быть одной редкости');
      if (!canCraft(burnRarity, target.rarity)) throw bad('Номер слишком редкий для этих жертв');
      const withDigit = (digit: number) => target.digits.map((d, i) => (i === position ? digit : d));
      const candidates = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(
        x => x !== target.digits[position] && canCraft(burnRarity, classifyRarity(withDigit(x)))
      );
      if (candidates.length === 0) throw bad('На этой позиции нет допустимых цифр');

      const now = this.ctx.now();
      for (const b of burns) sims.transfer(b.id, null, 'gone', now);

      const digits = withDigit(candidates[randInt(rng, candidates.length)]);
      const rarity = classifyRarity(digits);
      const value = rarity === target.rarity ? target.value : rollValue(rng, rarity);
      sims.updateDigits(target.id, digits, rarity, value);

      const sim = { id: target.id, digits, rarity, value };
      return { sim: toSimDTO(sim), album: this.album.register(userId, sim) };
    });
  }

  /**
   * Апгрейд: жертва сгорает в любом случае; при выигрыше игрок получает желаемый номер.
   * Шанс — доля выигрышных секторов колеса, зависит от разницы редкостей.
   * Первый апгрейд нового игрока всегда выигрывает.
   */
  upgrade(userId: number, sacrificeId: string, desired: unknown): UpgradeResponse {
    const { sims, rng } = this.ctx;
    return unitOfWork(this.ctx, () => {
      if (!isValidNumber(desired)) throw bad('Некорректный номер');
      const sacrifice = this.collection.ownedSim(userId, sacrificeId);
      const rarity = classifyRarity(desired);

      const now = this.ctx.now();
      sims.transfer(sacrifice.id, null, 'gone', now);

      // колесо обычное; но первый апгрейд игрока стрелка гарантированно останавливает на выигрышном секторе
      const layout = wheelLayout(upgradeWinSectors(sacrifice.rarity, rarity));
      const winning = layout.flatMap((w, i) => (w ? [i] : []));
      const sector = this.ctx.users.useFreeUpgrade(userId) ? winning[randInt(rng, winning.length)] : randInt(rng, WHEEL_SECTORS);
      const win = layout[sector];
      if (!win) return { win, sector, sim: null, album: [] };

      const sim = sims.insert({ id: newId(), digits: desired, rarity, value: rollValue(rng, rarity) }, userId, 'owned', now);
      return { win, sector, sim: toSimDTO(sim), album: this.album.register(userId, sim) };
    });
  }
}
