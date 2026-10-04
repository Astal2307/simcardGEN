import { useEffect, useState } from 'react';
import { fmt, type LeaderboardDTO } from '@simrush/shared';
import { api } from '../../api/endpoints';
import { Segmented } from '../../components/Segmented';
import { useGame } from '../../store/game';
import { useUi } from '../../store/ui';

export function RatingScreen() {
  const metric = useUi(s => s.rateSeg);
  const setUi = useUi(s => s.set);
  const sims = useGame(s => s.sims);
  const [board, setBoard] = useState<LeaderboardDTO | null>(null);

  // пересчитываем при смене метрики и изменении коллекции
  useEffect(() => {
    let alive = true;
    api.leaderboard(metric).then(b => alive && setBoard(b)).catch(() => {});
    return () => { alive = false; };
  }, [metric, sims]);

  const byVal = metric === 'value';
  return (
    <div className="col">
      <div className="card hero">
        <div className="col" style={{ gap: 4 }}>
          <span className="lbl">Место</span>
          <span className="disp" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.1 }}>#{board ? board.myRank : '—'}</span>
        </div>
        <div className="col" style={{ gap: 4, alignItems: 'flex-end', minWidth: 0 }}>
          <span className="lbl">{byVal ? 'Стоимость' : 'Номеров'}</span>
          <span className="tnum" style={{ fontSize: 18, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {board ? (byVal ? fmt(board.me.value) : board.me.count) : '—'}
          </span>
        </div>
      </div>
      <Segmented
        style={{ marginTop: 12 }}
        value={metric}
        onChange={v => setUi({ rateSeg: v })}
        options={[{ value: 'value', label: 'Стоимость' }, { value: 'count', label: 'Номера' }]}
      />
      <div className="col" style={{ marginTop: 10, gap: 4 }}>
        {board?.entries.map((p, i) => (
          <div className={'rk' + (p.me ? ' me' : '')} key={p.me ? 'me' : p.name + i}>
            <span className={'disp rk-n' + (i < 3 ? ' top' : '')}>{i + 1}</span>
            <span className="av">{p.name.charAt(0).toUpperCase()}</span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="ell" style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</span>
              <span className={'dot bg-' + p.best} />
            </span>
            <span className="tnum" style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', flex: 'none' }}>
              {byVal ? fmt(p.value) : p.count + ' шт'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
