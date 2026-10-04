import { fmt, questTitle, type QuestDTO, type QuestsDTO } from '@simrush/shared';
import { Check, Coin } from '../../components/icons';
import { isQuestDone, useQuests } from '../../store/quests';
import { hhmmss } from './time';

/** Задания дня с прогрессом и получением наград. */
export function QuestsSection({ data, now }: { data: QuestsDTO; now: number }) {
  return (
    <div className="col" data-tour="quests" style={{ gap: 12 }}>
      <div className="lr wrap">
        <span className="disp" style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' }}>Задания дня</span>
        <span className="meta" style={{ whiteSpace: 'nowrap' }}>
          Обновятся через <span className="mono" style={{ color: '#ECEDEF' }}>{hhmmss(data.nextAt - now)}</span>
        </span>
      </div>
      <div className="qlist">
        {data.quests.map(q => <QuestRow key={q.id} quest={q} />)}
      </div>
    </div>
  );
}

function QuestRow({ quest: q }: { quest: QuestDTO }) {
  const claim = useQuests(s => s.claim);
  const claiming = useQuests(s => s.claiming === q.id);
  const ready = isQuestDone(q) && !q.claimed;
  const pct = Math.round((q.progress / q.target) * 100);

  return (
    <div className={'qst' + (ready ? ' ready' : '') + (q.claimed ? ' done' : '')}>
      <div className="qst-top">
        <span className="qst-t">{questTitle(q.kind, q.target)}</span>
        {ready ? (
          <button className="bb qb" disabled={claiming} onClick={() => void claim(q.id)}>
            <Coin s={13} c="#0E0F12" />
            <span className="tnum">{fmt(q.reward)}</span>
          </button>
        ) : (
          <span className="val tnum" style={{ fontSize: 13 }}>
            {q.claimed ? <Check /> : <Coin s={13} />}
            <span>{fmt(q.reward)}</span>
          </span>
        )}
      </div>
      <div className="qst-bot">
        <div className="qst-bar">
          <div className={'qst-fill' + (isQuestDone(q) ? ' ok' : '')} style={{ width: pct + '%' }} />
        </div>
        <span className="qst-p mono">{q.progress}/{q.target}</span>
      </div>
    </div>
  );
}
