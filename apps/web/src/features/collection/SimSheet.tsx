import { useState } from 'react';
import { bidStep, defaultListPrice, fmt, instantSellPrice, phone, RARITY, type SimDTO } from '@simrush/shared';
import { Close, Coin, Minus, Plus } from '../../components/icons';
import { useGame } from '../../store/game';
import { useUi } from '../../store/ui';

/** Bottom sheet действий с номером: выставить на аукцион или продать сразу. */
export function SimSheet() {
  const simId = useUi(s => s.sheet);
  const sim = useGame(s => s.sims.find(x => x.id === simId));
  if (!sim) return null;
  return <SheetBody key={sim.id} sim={sim} />;
}

function SheetBody({ sim }: { sim: SimDTO }) {
  const setUi = useUi(s => s.set);
  const listSim = useGame(s => s.listSim);
  const sell = useGame(s => s.sell);
  const [price, setPrice] = useState(() => defaultListPrice(sim.value));
  const [busy, setBusy] = useState(false);

  const step = bidStep(sim.value);
  const close = () => setUi({ sheet: null });
  const bump = (dir: 1 | -1) => setPrice(p => Math.max(step, p + dir * step));
  const run = async (action: () => Promise<boolean>) => {
    if (busy) return;
    setBusy(true);
    if (await action()) close();
    setBusy(false);
  };

  return (
    <>
      <button className="ov" aria-label="Закрыть" onClick={close} />
      <div className="sh">
        <div className="grab" />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div className="col" style={{ gap: 8, minWidth: 0 }}>
            <span className="mono ell" style={{ fontSize: 22, fontWeight: 600 }}>{phone(sim.digits)}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={'tag t-' + sim.rarity}>{RARITY[sim.rarity].name}</span>
              <span className="val tnum"><Coin s={14} /><span>{fmt(sim.value)}</span></span>
            </span>
          </div>
          <button className="ib" aria-label="Закрыть" onClick={close} style={{ width: 44, height: 44, margin: '-6px -10px 0 0' }}>
            <Close />
          </button>
        </div>
        <div style={{ height: 1, background: '#23262D' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 14, color: '#8A8F98' }}>Старт аукциона</span>
          <div className="stepper">
            <button className="ib" aria-label="Меньше" style={{ width: 44, height: 44, borderRadius: 12 }} onClick={() => bump(-1)}><Minus /></button>
            <span className="tnum" style={{ minWidth: 84, textAlign: 'center', fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(price)}</span>
            <button className="ib" aria-label="Больше" style={{ width: 44, height: 44, borderRadius: 12 }} onClick={() => bump(1)}><Plus /></button>
          </div>
        </div>
        <div className="col" style={{ gap: 10 }}>
          <button className="btn1" disabled={busy} onClick={() => void run(() => listSim(sim.id, price))}>На аукцион</button>
          <button className="btn2" disabled={busy} onClick={() => void run(() => sell(sim.id))}>
            <span>Продать сразу</span>
            <span className="val tnum" style={{ fontSize: 15 }}><Coin s={14} /><span>{fmt(instantSellPrice(sim.value))}</span></span>
          </button>
        </div>
      </div>
    </>
  );
}
