import type { ClaimQuestResponse, QuestKind, QuestsDTO } from '@simrush/shared';
import { DomainError, notFound } from '../domain/errors';
import type { Outbox } from '../domain/notifier';
import { drawDailyQuests } from '../domain/quests';
import { toQuestDTO, type Quest, type QuestsRepo } from '../repositories/quests';
import { unitOfWork, type ServiceContext } from './context';

/**
 * Ежедневные задания: три задания на игровой день, прогресс по действиям игрока.
 * Задания создаются лениво — при первом обращении или первом действии за день.
 */
export class QuestService {
  constructor(
    private readonly ctx: ServiceContext,
    private readonly repo: QuestsRepo
  ) {}

  list(userId: number): QuestsDTO {
    return unitOfWork(this.ctx, () => this.snapshot(userId, this.today()));
  }

  claim(userId: number, questId: string): ClaimQuestResponse {
    return unitOfWork(this.ctx, out => {
      const today = this.today();
      const quest = this.repo.findById(questId);
      if (!quest || quest.userId !== userId || quest.day !== today) throw notFound('Задание');
      if (quest.claimed) throw new DomainError('QUEST_CLAIMED', 'Награда уже получена');
      if (quest.progress < quest.target || !this.repo.markClaimed(quest.id)) {
        throw new DomainError('QUEST_NOT_DONE', 'Задание ещё не выполнено');
      }
      const balance = this.ctx.users.adjustBalance(userId, quest.reward)!;
      out.toUser(userId, 'balance', { balance });
      return { balance, reward: quest.reward, quests: this.snapshot(userId, today) };
    });
  }

  /**
   * Засчитывает действие игрока. Вызывается сервисами внутри их транзакции;
   * события уходят через их outbox после коммита.
   */
  track(out: Outbox, userId: number, kind: QuestKind, amount = 1): void {
    const today = this.today();
    this.ensure(userId, today);
    const quest = this.repo.advance(userId, today, kind, amount);
    if (!quest) return;
    if (quest.progress >= quest.target) {
      out.toUser(userId, 'notice', { kind: 'quest_done', quest: quest.kind, target: quest.target });
    }
    out.toUser(userId, 'quests', this.snapshot(userId, today));
  }

  private today(): number {
    return this.ctx.calendar.dayOf(this.ctx.now());
  }

  private ensure(userId: number, day: number): Quest[] {
    const existing = this.repo.listForDay(userId, day);
    if (existing.length > 0) return existing;
    this.repo.replaceForDay(userId, day, drawDailyQuests(this.ctx.rng));
    return this.repo.listForDay(userId, day);
  }

  private snapshot(userId: number, day: number): QuestsDTO {
    return {
      quests: this.ensure(userId, day).map(toQuestDTO),
      nextAt: this.ctx.calendar.startOf(day + 1)
    };
  }
}
