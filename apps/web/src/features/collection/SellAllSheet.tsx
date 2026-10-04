import { useState } from 'react';
import { fmt, instantSellPrice, plural, RARITY } from '@simrush/shared';
import { Close, Coin } from '../../components/icons';
import { useGame } from '../../store/game';
import { useUi } from '../../store/ui';

/** Подтверждение продажи всех номеров по текущему фильтру редкости. */
export function SellAllSheet() {
  const open = useUi(s => s.sellAllOpen);
  if (!open) return null;
  return <SheetBody />;
}

function SheetBody() {
  const filter = useUi(s => s.collFilter);
  const setUi = useUi(s => s.set);
  const sims = useGame(s => s.sims);
  const sellMany = useGame(s => s.sellMany);
  const [busy, setBusy] = useState(false);

  const items = sims.filter(x => filter === 'all' || x.rarity === filter);
  const amount = items.reduce((a, x) => a + instantSellPrice(x.value), 0);
  const close = () => setUi({ sellAllOpen: false });

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    if (await sellMany(items.map(x => x.id))) close();
    setBusy(false);
  };

  return (
    <>
      <button className="ov" aria-label="Закрыть" onClick={close} />
      <div className="sh">
        <div className="grab" />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div className="col" style={{ gap: 8, minWidth: 0 }}>
            <span className="disp" style={{ fontSize: 18, fontWeight: 600 }}>
              {items.length} {plural(items.length, ['номер', 'номера', 'номеров'])}
            </span>
            {filter !== 'all' && <span className={'tag t-' + filter} style={{ alignSelf: 'flex-start' }}>{RARITY[filter].name}</span>}
          </div>
          <button className="ib" aria-label="Закрыть" onClick={close} style={{ width: 44, height: 44, margin: '-6px -10px 0 0' }}>
            <Close />
          </button>
        </div>
        <button className="btn1" disabled={busy || items.length === 0} onClick={() => void confirm()}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Продать
            <Coin s={15} c="#0E0F12" />
            <span className="tnum">{fmt(amount)}</span>
          </span>
        </button>
      </div>
    </>
  );
}
