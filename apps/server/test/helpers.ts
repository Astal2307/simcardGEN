import type { ServerEventName, ServerEvents } from '@simrush/shared';
import { createContainer } from '../src/container';
import { openDatabase } from '../src/db/database';
import type { Notifier } from '../src/domain/notifier';

export interface Sent {
  userId: number | null;
  event: ServerEventName;
  data: unknown;
}

/** Контейнер на in-memory SQLite с управляемыми часами и RNG. */
export function setup(opts: { rng?: () => number } = {}) {
  const sent: Sent[] = [];
  const notifier: Notifier = {
    toUser<E extends ServerEventName>(userId: number, event: E, data: ServerEvents[E]) { sent.push({ userId, event, data }); },
    broadcast<E extends ServerEventName>(event: E, data: ServerEvents[E]) { sent.push({ userId: null, event, data }); }
  };
  const clock = { now: 1_000_000 };
  // 0.5: боты не ставят (шанс < 0.5), лоты дешёвые (uncommon), спин — common
  const rng = opts.rng ?? (() => 0.5);
  const app = createContainer({ db: openDatabase(':memory:'), notifier, rng, now: () => clock.now, allowForcedRarity: true });
  const advance = (ms: number) => { clock.now += ms; };
  /** Уведомления игроку, кроме уведомлений о заданиях (они проверяются отдельно). */
  const notices = (userId: number) =>
    sent
      .filter(s => s.userId === userId && s.event === 'notice')
      .map(s => s.data as { kind: string })
      .filter(n => n.kind !== 'quest_done');
  return { app, sent, clock, advance, notices };
}
