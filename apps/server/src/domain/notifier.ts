import type { ServerEventName, ServerEvents } from '@simrush/shared';

/** Канал доставки событий клиентам; реализуется realtime-хабом. */
export interface Notifier {
  toUser<E extends ServerEventName>(userId: number, event: E, data: ServerEvents[E]): void;
  broadcast<E extends ServerEventName>(event: E, data: ServerEvents[E]): void;
}

export const nullNotifier: Notifier = { toUser() {}, broadcast() {} };

/**
 * Буфер событий, накопленных внутри транзакции.
 * Отправляется только после успешного коммита — откат не порождает «фантомных» уведомлений.
 */
export class Outbox {
  private readonly pending: ((n: Notifier) => void)[] = [];
  lotsChanged = false;

  toUser<E extends ServerEventName>(userId: number, event: E, data: ServerEvents[E]): void {
    this.pending.push(n => n.toUser(userId, event, data));
  }

  flush(notifier: Notifier): void {
    for (const send of this.pending) send(notifier);
    this.pending.length = 0;
  }
}
