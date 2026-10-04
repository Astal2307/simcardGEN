import { useState } from 'react';
import { fmt, instantSellPrice, RARITIES, RARITY, shortNum, SPIN_COST } from '@simrush/shared';
import { Coin } from '../../components/icons';
import { useGame } from '../../store/game';
import { useUpgrades } from '../../store/upgrades';
import { SimStage } from './SimStage';
import { useSpin } from './spinStore';

export function SpinScreen() {
  const spinning = useSpin(s => s.spinning);
  const recent = useSpin(s => s.recent);
  const spin = useSpin(s => s.spin);
  const balance = useGame(s => s.balance);
  const pity = useUpgrades(s => s.data?.pity);
  const result = useSpin(s => s.result);
  const sell = useGame(s => s.sell);
  const [selling, setSelling] = useState(false);
  // продать можно, пока выпавший номер лежит в инвентаре (не продан, не на аукционе)
  const sellable = useGame(s => !spinning && !!result && s.sims.some(x => x.id === result.id));

  const sellResult = async () => {
    if (!result || selling) return;
    setSelling(true);
    await sell(result.id);
    setSelling(false);
  };

  return (
    <div className="col">
      <SimStage />

      <div className="spin-row">
        <button className="spin-btn" data-tour="spin" onClick={() => void spin()} disabled={spinning || balance < SPIN_COST}>
          <span className="disp" style={{ fontWeight: 600, fontSize: 15 }}>Крутить</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 600 }}>
            <Coin c="#0E0F12" />
            <span>{fmt(SPIN_COST)}</span>
          </span>
        </button>
        {sellable && result && (
          <button className="spin-sell" disabled={selling} onClick={() => void sellResult()}>
            <span>Продать</span>
            <span className="val tnum"><Coin s={13} /><span>{fmt(instantSellPrice(result.value))}</span></span>
          </button>
        )}
      </div>

      <div className="grid5" data-tour="chances">
        {RARITIES.map(r => (
          <div key={r} className="pill tnum">
            <span className={'dot bg-' + r} />
            <span>{String(RARITY[r].chance).replace('.', ',')}%</span>
          </div>
        ))}
      </div>

      {pity && (
        <div className="grid4" data-tour="pity" style={{ marginTop: 6 }}>
          {pity.map(p => {
            const r = RARITIES[p.tier - 1];
            return (
              <div key={p.tier} className="pill pity tnum">
                <span className={'dot bg-' + r} />
                <span className="mono">{p.count}/{p.period}</span>
                <span className={'pity-f bg-' + r} style={{ width: `calc((100% - 20px) * ${p.count / p.period})` }} />
              </div>
            );
          })}
        </div>
      )}

      {recent.length > 0 && (
        <div className="col" style={{ marginTop: 20, gap: 8 }}>
          <div className="lbl">Последние</div>
          <div className="grid4">
            {recent.map(x => (
              <div className="pill up" key={x.id} style={{ height: 36 }}>
                <span className={'dot bg-' + x.rarity} />
                <span className="mono" style={{ fontSize: 12.5, fontWeight: 500, color: '#ECEDEF' }}>{shortNum(x.digits)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
