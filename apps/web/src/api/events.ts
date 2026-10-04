import type { ServerEventName, ServerEvents } from '@simrush/shared';
import { API_BASE } from './http';

export type EventHandlers = { [E in ServerEventName]?: (data: ServerEvents[E]) => void } & {
  /** Вызывается при каждом (пере)подключении. */
  open?: () => void;
};

/** Подписка на поток событий сервера. EventSource сам переподключается при обрыве. */
export function subscribeEvents(token: string, handlers: EventHandlers): () => void {
  const es = new EventSource(`${API_BASE}/api/events?token=${encodeURIComponent(token)}`);
  if (handlers.open) es.addEventListener('open', handlers.open);
  for (const [name, handler] of Object.entries(handlers)) {
    if (name === 'open' || !handler) continue;
    es.addEventListener(name, e => (handler as (d: unknown) => void)(JSON.parse((e as MessageEvent<string>).data)));
  }
  return () => es.close();
}
