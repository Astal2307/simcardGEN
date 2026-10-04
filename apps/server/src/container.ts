import type { DB } from './db/database';
import { GameCalendar } from './domain/calendar';
import { nullNotifier, type Notifier } from './domain/notifier';
import { defaultRng, type Rng } from './domain/random';
import { AlbumRepo } from './repositories/album';
import { LotsRepo } from './repositories/lots';
import { QuestsRepo } from './repositories/quests';
import { SimsRepo } from './repositories/sims';
import { UpgradesRepo } from './repositories/upgrades';
import { UsersRepo } from './repositories/users';
import { AccountService } from './services/account';
import { AlbumService } from './services/album';
import { BonusService } from './services/bonus';
import { CollectionService } from './services/collection';
import type { ServiceContext } from './services/context';
import { LeaderboardService } from './services/leaderboard';
import { MarketService } from './services/market';
import { QuestService } from './services/quests';
import { SpinService } from './services/spin';
import { UpgradeService } from './services/upgrades';
import { WorkshopService } from './services/workshop';

export interface ContainerOptions {
  db: DB;
  notifier?: Notifier;
  rng?: Rng;
  now?: () => number;
  allowForcedRarity?: boolean;
  /** Смещение часового пояса, в полночь которого сменяется игровой день, мин (по умолчанию МСК). */
  gameTzOffsetMin?: number;
}

/** Собирает репозитории и сервисы приложения (composition root). */
export function createContainer(opts: ContainerOptions) {
  const ctx: ServiceContext = {
    db: opts.db,
    users: new UsersRepo(opts.db),
    sims: new SimsRepo(opts.db),
    lots: new LotsRepo(opts.db),
    rng: opts.rng ?? defaultRng,
    now: opts.now ?? Date.now,
    calendar: new GameCalendar(opts.gameTzOffsetMin ?? 180),
    notifier: opts.notifier ?? nullNotifier
  };
  const quests = new QuestService(ctx, new QuestsRepo(opts.db));
  const upgrades = new UpgradeService(ctx, new UpgradesRepo(opts.db));
  const album = new AlbumService(ctx, new AlbumRepo(opts.db));
  const collection = new CollectionService(ctx, quests);
  return {
    ctx,
    account: new AccountService(ctx),
    spin: new SpinService(ctx, quests, upgrades, album, opts.allowForcedRarity ?? false),
    collection,
    market: new MarketService(ctx, collection, quests, album),
    leaderboard: new LeaderboardService(ctx),
    bonus: new BonusService(ctx),
    quests,
    upgrades,
    album,
    workshop: new WorkshopService(ctx, collection, album)
  };
}

export type Container = ReturnType<typeof createContainer>;
