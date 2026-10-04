import type { FastifyInstance } from 'fastify';
import { isRarity, type CraftRequest, type LeaderboardMetric, type SellManyRequest, type TutorialRequest, type ListRequest, type SpinRequest, type UpgradeRequest } from '@simrush/shared';
import type { Container } from '../container';
import type { RealtimeHub } from '../realtime/hub';
import { requireUser } from './auth';

type IdParams = { Params: { id: string } };

export async function registerRoutes(http: FastifyInstance, app: Container, hub: RealtimeHub): Promise<void> {
  http.get('/api/health', async () => ({ ok: true }));

  // гостевая сессия: без регистрации, токен хранится на клиенте
  http.post('/api/session', async () => app.account.register());

  await http.register(async api => {
    api.addHook('preHandler', requireUser(app));

    api.get('/api/me', async req => app.account.me(req.user.id));
    api.post('/api/wallet/topup', async req => app.account.topUp(req.user.id));
    api.post<{ Body: TutorialRequest }>('/api/tutorial', {
      schema: { body: { type: 'object', required: ['step'], properties: { step: { type: 'integer' } } } }
    }, async (req, reply) => {
      app.account.setTutorial(req.user.id, req.body.step);
      return reply.code(204).send();
    });

    api.get('/api/bonus', async req => app.bonus.status(req.user.id));
    api.post('/api/bonus/claim', async req => app.bonus.claim(req.user.id));

    api.get('/api/album', async req => app.album.state(req.user.id));
    api.post<IdParams>('/api/album/:id/claim', async req => app.album.claim(req.user.id, req.params.id));

    api.get('/api/upgrades', async req => app.upgrades.state(req.user.id));
    api.post<IdParams>('/api/upgrades/:id/buy', async req => app.upgrades.buy(req.user.id, req.params.id));

    api.get('/api/quests', async req => app.quests.list(req.user.id));
    api.post<IdParams>('/api/quests/:id/claim', async req => app.quests.claim(req.user.id, req.params.id));

    api.post<{ Body: SpinRequest | undefined }>('/api/spin', async req => {
      const r = req.body?.rarity;
      return app.spin.spin(req.user.id, isRarity(r) ? r : undefined);
    });

    api.get('/api/sims', async req => app.collection.list(req.user.id));
    api.post<IdParams>('/api/sims/:id/sell', async req => app.collection.sell(req.user.id, req.params.id));
    api.post<{ Body: SellManyRequest }>('/api/sims/sell-many', {
      schema: {
        body: {
          type: 'object',
          required: ['ids'],
          properties: { ids: { type: 'array', items: { type: 'string' }, maxItems: 1000 } }
        }
      }
    }, async req => app.collection.sellMany(req.user.id, req.body.ids));
    api.post<IdParams & { Body: ListRequest }>('/api/sims/:id/list', {
      schema: {
        body: {
          type: 'object',
          required: ['startPrice'],
          properties: { startPrice: { type: 'integer', minimum: 1 } }
        }
      }
    }, async req => app.market.listSim(req.user.id, req.params.id, req.body.startPrice));

    api.post<{ Body: CraftRequest }>('/api/craft', {
      schema: {
        body: {
          type: 'object',
          required: ['targetId', 'burnIds', 'position'],
          properties: {
            targetId: { type: 'string' },
            burnIds: { type: 'array', items: { type: 'string' } },
            position: { type: 'integer' }
          }
        }
      }
    }, async req => app.workshop.craft(req.user.id, req.body.targetId, req.body.burnIds, req.body.position));

    api.post<{ Body: UpgradeRequest }>('/api/upgrade', {
      schema: {
        body: {
          type: 'object',
          required: ['sacrificeId', 'digits'],
          properties: { sacrificeId: { type: 'string' }, digits: { type: 'array', items: { type: 'integer' } } }
        }
      }
    }, async req => app.workshop.upgrade(req.user.id, req.body.sacrificeId, req.body.digits));

    api.get('/api/lots', async () => app.market.snapshot());
    api.post<IdParams>('/api/lots/:id/bid', async req => app.market.bid(req.user.id, req.params.id));
    api.post<IdParams>('/api/lots/:id/cancel', async (req, reply) => {
      app.market.cancel(req.user.id, req.params.id);
      return reply.code(204).send();
    });

    api.get<{ Querystring: { by?: string } }>('/api/leaderboard', async req => {
      const by: LeaderboardMetric = req.query.by === 'count' ? 'count' : 'value';
      return app.leaderboard.get(req.user.id, by);
    });

    // поток событий реального времени
    api.get('/api/events', (req, reply) => {
      reply.hijack();
      hub.connect(req.user.id, reply.raw);
      hub.send(reply.raw, 'lots', app.market.snapshot());
      hub.send(reply.raw, 'balance', { balance: app.account.me(req.user.id).balance });
    });
  });
}
