import type { ReactNode } from 'react';
import { fmt, RARITY } from '@simrush/shared';
import { Coin } from '../../components/icons';
import { useFit } from '../../lib/hooks';
import { useSpin } from './spinStore';

const RINGS = { common: 0, uncommon: 1, rare: 2, epic: 2, legendary: 3 } as const;

/** Сцена с SIM-картой: барабан цифр, вспышки редкости и счётчик стоимости. */
export function SimStage() {
  const { spinning, locked, roll, pending, result, showFx, particles, fxKey, countVal } = useSpin();
  const fit = useFit();
  const fx = showFx && !!result;
  const rk = result ? result.rarity : 'common';

  const digits: ReactNode[] = [];
  for (let i = 0; i < 10; i++) {
    let ch: number;
    let cls: string;
    if (spinning) {
      const lk = !!pending && i < locked;
      ch = lk ? pending.digits[i] : roll[i];
      cls = lk ? 'd-lock' : 'd-roll';
    } else if (result) {
      ch = result.digits[i];
      cls = 'd-lock';
    } else {
      ch = i === 0 ? 9 : 0;
      cls = 'd-idle';
    }
    digits.push(<span key={'d' + i} className={'dg ' + cls}><span className="dg-in">{ch}</span></span>);
    if (i === 2) digits.push(<span key="gp" className="gp" />);
    if (i === 5 || i === 7) digits.push(<span key={'s' + i} className="sep">-</span>);
  }

  return (
    <div className="stage">
      <div data-tour="reel" style={{ position: 'relative', flex: 'none', width: 326 * fit, height: 206 * fit }}>
        <div className="scaler" style={{ transform: `scale(${fit})` }}>
          <div className={'cw' + (spinning ? ' spin' : '') + (fx ? ' fx-' + rk : '')} key={'cw' + fxKey}>
            {fx && [0, 180, 360].slice(0, RINGS[rk]).map(d => (
              <div key={d} className={'ring ring-' + rk} style={{ animationDelay: `${d}ms` }} />
            ))}
            <div className={'co ' + (fx ? 'b-' + rk : spinning ? 'b-spin' : '')}>
              <div className="ci">
                {fx && (rk === 'epic' || rk === 'legendary') && <div className="sw" />}
                <div className="chip" />
                <div className={'num mono ' + (fx ? 'r-' + rk : '')}>
                  <span className="pfx">+7</span>
                  {digits}
                </div>
              </div>
            </div>
            {fx && (
              <div className="pts">
                {particles.map((p, i) => (
                  <div key={i} className="pw" style={{ transform: `rotate(${p.a}deg)` }}>
                    <div className={'pt ' + p.cls} style={{ animationDelay: `${p.delay}ms`, background: p.color }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="rinfo">
        {fx && (
          <>
            <div className={'disp rl up c-' + rk}>{RARITY[rk].name}</div>
            <div className="rv up2 tnum"><Coin /><span>{fmt(countVal)}</span></div>
          </>
        )}
      </div>
    </div>
  );
}
