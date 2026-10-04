import { existsSync } from 'node:fs';
import Fastify, { type FastifyError } from 'fastify';
import fastifyStatic from '@fastify/static';
import type { ErrorResponse } from '@simrush/shared';
import type { Container } from '../container';
import { DomainError } from '../domain/errors';
import type { RealtimeHub } from '../realtime/hub';
import { registerRoutes } from './routes';

export interface HttpOptions {
  logger: boolean;
  /** Каталог собранного фронтенда; если он есть — отдаём SPA с того же сервера. */
  webDist?: string;
  /** Источники, которым разрешены кросс-доменные запросы (фронт на GitHub Pages). */
  corsOrigins?: string[];
}

export async function buildHttp(app: Container, hub: RealtimeHub, opts: HttpOptions) {
  const http = Fastify({ logger: opts.logger ? { level: 'info' } : false });

  // CORS: заголовки ставим на raw-ответ — так они попадут и в SSE-поток, который пишется мимо Fastify
  const origins = new Set(opts.corsOrigins ?? []);
  if (origins.size > 0) {
    http.addHook('onRequest', async (req, reply) => {
      const origin = req.headers.origin;
      if (!origin || !origins.has(origin)) return;
      reply.raw.setHeader('Access-Control-Allow-Origin', origin);
      reply.raw.setHeader('Vary', 'Origin');
      if (req.method === 'OPTIONS') {
        reply.raw.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        reply.raw.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        reply.raw.setHeader('Access-Control-Max-Age', '86400');
        return reply.code(204).send();
      }
    });
  }

  http.setErrorHandler((err: FastifyError | DomainError, req, reply) => {
    let body: ErrorResponse;
    if (err instanceof DomainError) {
      body = { error: err.code, message: err.message };
      reply.code(err.status);
    } else if ((err as FastifyError).validation) {
      body = { error: 'BAD_REQUEST', message: err.message };
      reply.code(400);
    } else {
      req.log.error(err);
      body = { error: 'INTERNAL', message: 'Внутренняя ошибка сервера' };
      reply.code(500);
    }
    return reply.send(body);
  });

  await registerRoutes(http, app, hub);

  if (opts.webDist && existsSync(opts.webDist)) {
    await http.register(fastifyStatic, { root: opts.webDist, wildcard: false });
    http.setNotFoundHandler((req, reply) => {
      if (req.method === 'GET' && !req.url.startsWith('/api/')) return reply.sendFile('index.html');
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Не найдено' } satisfies ErrorResponse);
    });
  }

  return http;
}
