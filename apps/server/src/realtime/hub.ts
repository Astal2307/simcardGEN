import type { ServerResponse } from 'node:http';
import type { ServerEventName, ServerEvents } from '@simrush/shared';
import type { Notifier } from '../domain/notifier';

const HEARTBEAT_MS = 25_000;

/** Держит SSE-подключения игроков и рассылает им события. */
export class RealtimeHub implements Notifier {
  private readonly clients = new Map<number, Set<ServerResponse>>();
  private readonly heartbeat: NodeJS.Timeout;

  constructor() {
    this.heartbeat = setInterval(() => this.each(res => res.write(': ping\n\n')), HEARTBEAT_MS);
    this.heartbeat.unref();
  }

  /** Регистрирует ответ как SSE-поток игрока. */
  connect(userId: number, res: ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.write('retry: 2000\n\n');
    let set = this.clients.get(userId);
    if (!set) this.clients.set(userId, (set = new Set()));
    set.add(res);
    res.on('close', () => {
      set.delete(res);
      if (set.size === 0) this.clients.delete(userId);
    });
  }

  send<E extends ServerEventName>(res: ServerResponse, event: E, data: ServerEvents[E]): void {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  toUser<E extends ServerEventName>(userId: number, event: E, data: ServerEvents[E]): void {
    this.clients.get(userId)?.forEach(res => this.send(res, event, data));
  }

  broadcast<E extends ServerEventName>(event: E, data: ServerEvents[E]): void {
    const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    this.each(res => res.write(frame));
  }

  close(): void {
    clearInterval(this.heartbeat);
    this.each(res => res.end());
    this.clients.clear();
  }

  private each(fn: (res: ServerResponse) => void): void {
    for (const set of this.clients.values()) set.forEach(fn);
  }
}
