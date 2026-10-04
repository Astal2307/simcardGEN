import type { LeaderboardDTO, LeaderboardEntry, LeaderboardMetric } from '@simrush/shared';
import { BOT_PLAYERS } from '../domain/bots';
import type { ServiceContext } from './context';

const LIMIT = 50;

export class LeaderboardService {
  constructor(private readonly ctx: ServiceContext) {}

  get(userId: number, metric: LeaderboardMetric): LeaderboardDTO {
    const stats = this.ctx.sims.ownerStats();
    const mine = stats.find(s => s.ownerId === userId);
    const me: LeaderboardEntry = mine
      ? { name: 'Вы', value: mine.value, count: mine.count, best: mine.best, me: true }
      : { name: 'Вы', value: 0, count: 0, best: 'common', me: true };

    const entries: LeaderboardEntry[] = [
      ...BOT_PLAYERS.map(b => ({ ...b, me: false })),
      ...stats.filter(s => s.ownerId !== userId).map(s => ({ name: s.name, value: s.value, count: s.count, best: s.best, me: false })),
      me
    ].sort((a, b) => b[metric] - a[metric]);

    return { entries: entries.slice(0, LIMIT), myRank: entries.indexOf(me) + 1, me };
  }
}
