import { describe, expect, it } from 'vitest';
import { QUEST_KINDS, QUESTS_PER_DAY, questTitle, START_BALANCE, type QuestKind } from '@simrush/shared';
import type { DomainError } from '../src/domain/errors';
import { drawDailyQuests } from '../src/domain/quests';
import { setup } from './helpers';

const DAY = 86_400_000;
const code = (fn: () => unknown) => {
  try { fn(); } catch (e) { return (e as DomainError).code; }
  return 'OK';
};

describe('набор заданий', () => {
  it('три разных вида, первое — спины', () => {
    for (let i = 0; i < 200; i++) {
      const qs = drawDailyQuests(Math.random);
      expect(qs).toHaveLength(QUESTS_PER_DAY);
      expect(qs[0].kind).toBe('spin');
      expect(new Set(qs.map(q => q.kind)).size).toBe(QUESTS_PER_DAY);
    }
  });

  it('у каждого вида есть название', () => {
    for (const k of QUEST_KINDS) expect(questTitle(k, 5)).toBeTruthy();
    expect(questTitle('spin', 1)).toBe('Сделайте 1 спин');
    expect(questTitle('spin', 3)).toBe('Сделайте 3 спина');
    expect(questTitle('bid', 5)).toBe('Сделайте 5 ставок на аукционе');
  });
});

describe('ежедневные задания', () => {
  it('задания стабильны в течение дня и меняются на следующий', () => {
    const { app, advance } = setup({ rng: Math.random });
    const u = app.account.register().user;
    const a = app.quests.list(u.id);
    expect(app.quests.list(u.id)).toEqual(a);
    advance(DAY);
    const b = app.quests.list(u.id);
    expect(b.quests.map(q => q.id)).not.toEqual(a.quests.map(q => q.id));
    expect(b.nextAt).toBe(a.nextAt + DAY);
  });

  it('спины засчитываются, награда выдаётся один раз', () => {
    const { app, sent } = setup();
    const u = app.account.register().user;
    const quest = app.quests.list(u.id).quests.find(q => q.kind === 'spin')!;

    expect(code(() => app.quests.claim(u.id, quest.id))).toBe('QUEST_NOT_DONE');
    for (let i = 0; i < quest.target + 2; i++) app.spin.spin(u.id);

    const done = app.quests.list(u.id).quests.find(q => q.id === quest.id)!;
    expect(done.progress).toBe(quest.target); // прогресс не превышает цель
    expect(sent.filter(s => s.event === 'notice' && (s.data as { kind: string }).kind === 'quest_done')).toHaveLength(1);

    const spent = (quest.target + 2) * 1000;
    const res = app.quests.claim(u.id, quest.id);
    expect(res.balance).toBe(START_BALANCE - spent + quest.reward);
    expect(res.quests.quests.find(q => q.id === quest.id)!.claimed).toBe(true);
    expect(code(() => app.quests.claim(u.id, quest.id))).toBe('QUEST_CLAIMED');
  });

  it('вчерашнее задание забрать нельзя', () => {
    const { app, advance } = setup();
    const u = app.account.register().user;
    const quest = app.quests.list(u.id).quests[0];
    for (let i = 0; i < quest.target; i++) app.spin.spin(u.id);
    advance(DAY);
    expect(code(() => app.quests.claim(u.id, quest.id))).toBe('NOT_FOUND');
  });

  it('чужое задание забрать нельзя', () => {
    const { app } = setup();
    const a = app.account.register().user;
    const b = app.account.register().user;
    const quest = app.quests.list(a.id).quests[0];
    expect(code(() => app.quests.claim(b.id, quest.id))).toBe('NOT_FOUND');
  });

  it('действия на рынке и в коллекции двигают свои задания', () => {
    // перебираем seed, пока в наборе не окажется нужный вид
    const progressOf = (kind: QuestKind, act: (t: ReturnType<typeof setup>, userId: number) => void) => {
      for (let seed = 0; seed < 50; seed++) {
        let x = seed / 50;
        const t = setup({ rng: () => (x = (x * 9301 + 0.4927) % 1) });
        const u = t.app.account.register().user;
        const q = t.app.quests.list(u.id).quests.find(q => q.kind === kind);
        if (!q) continue;
        act(t, u.id);
        return t.app.quests.list(u.id).quests.find(qq => qq.id === q.id)!.progress;
      }
      throw new Error('не нашли набор с ' + kind);
    };

    expect(progressOf('quick_sell', (t, id) => t.app.collection.sell(id, t.app.collection.list(id)[0].id))).toBe(1);
    expect(progressOf('list_lot', (t, id) => t.app.market.listSim(id, t.app.collection.list(id)[0].id, 1000))).toBe(1);
  });
});
