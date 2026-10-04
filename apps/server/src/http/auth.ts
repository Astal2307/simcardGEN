import type { FastifyReply, FastifyRequest } from 'fastify';
import { DomainError } from '../domain/errors';
import type { Container } from '../container';
import type { User } from '../repositories/users';

declare module 'fastify' {
  interface FastifyRequest {
    user: User;
  }
}

/**
 * Достаёт гостевой токен из `Authorization: Bearer …`
 * или из `?token=` (EventSource не умеет ставить заголовки).
 */
function readToken(req: FastifyRequest): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  const query = req.query as { token?: unknown } | undefined;
  return typeof query?.token === 'string' ? query.token : undefined;
}

export const requireUser = (app: Container) => async (req: FastifyRequest, _reply: FastifyReply) => {
  const token = readToken(req);
  const user = token ? app.account.authenticate(token) : undefined;
  if (!user) throw new DomainError('UNAUTHORIZED', 'Нужна авторизация');
  req.user = user;
};
