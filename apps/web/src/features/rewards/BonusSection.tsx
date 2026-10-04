import { DAILY_BONUS_MAX_DAY, DAILY_BONUS_REWARDS, fmt, type DailyBonusDTO } from '@simrush/shared';
import { Check, Coin } from '../../components/icons';
import { useBonus } from '../../store/bonus';
import { hhmmss } from './time';

/** Ежедневный бонус: прогресс серии по 7 дням и получение награды. */
export function BonusSection({ bonus, now }: { bonus: DailyBonusDTO; now: number }) {
  const claim = useBonus(s => s.claim);
  const { day, claimedToday } = bonus;

  return (
    <>
      <div className="bonus-grid">
        {DAILY_BONUS_REWARDS.map((reward, i) => {
          const n = i + 1;
          const done = n < day || (n === day && claimedToday);
          const cur = n === day && !claimedToday;
          const cls = 'bd' + (done ? ' done' : '') + (cur ? ' cur' : '') + (n === DAILY_BONUS_MAX_DAY ? ' top' : '');
          return (
            <div key={n} className={cls}>
              <span className="lbl" style={{ fontSize: 11 }}>День {n}</span>
              <span className="bd-v tnum">
                {done ? <Check /> : <Coin s={14} c={n === DAILY_BONUS_MAX_DAY ? '#F5B83D' : '#8A8F98'} />}
                <span>{fmt(reward)}</span>
              </span>
            </div>
          );
        })}
      </div>

      {claimedToday ? (
        <div className="btn2" style={{ color: '#8A8F98' }}>
          <span>Следующий бонус</span>
          <span className="mono" style={{ color: '#ECEDEF' }}>{hhmmss(bonus.nextAt - now)}</span>
        </div>
      ) : (
        <button className="btn1" onClick={() => void claim()}>
          Забрать {fmt(DAILY_BONUS_REWARDS[day - 1])}
        </button>
      )}
    </>
  );
}
