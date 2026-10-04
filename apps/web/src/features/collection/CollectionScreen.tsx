import { fmt, instantSellPrice, phone, RARITY } from '@simrush/shared';
import { Coin, SimIcon } from '../../components/icons';
import { RarityChips } from '../../components/RarityChips';
import { useGame } from '../../store/game';
import { useUi } from '../../store/ui';
import { Segmented } from '../../components/Segmented';
import { CraftPanel } from '../workshop/CraftPanel';
import { UpgradePanel } from '../workshop/UpgradePanel';

export function CollectionScreen() {
  const seg = useUi(s => s.collSeg);
  const setSeg = useUi(s => s.set);
  return (
    <div className="col">
      <div data-tour="workshop">
      <Segmented
        value={seg}
        onChange={v => setSeg({ collSeg: v })}
        options={[{ value: 'list', label: 'Список' }, { value: 'craft', label: 'Крафт' }, { value: 'upgrade', label: 'Апгрейд' }]}
        style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginBottom: 12 }}
      />
      </div>
      {seg === 'list' && <SimList />}
      {seg === 'craft' && <CraftPanel />}
      {seg === 'upgrade' && <UpgradePanel />}
    </div>
  );
}

function SimList() {
  const sims = useGame(s => s.sims);
  const filter = useUi(s => s.collFilter);
  const setUi = useUi(s => s.set);

  const items = sims.filter(x => filter === 'all' || x.rarity === filter);
  const total = sims.reduce((a, x) => a + x.value, 0);

  return (
    <div className="col">
      <div className="grid2">
        <div className="card stat"><div className="lbl">Номеров</div><div className="disp stat-v">{sims.length}</div></div>
        <div className="card stat"><div className="lbl">Стоимость</div><div className="disp stat-v">{fmt(total)}</div></div>
      </div>
      <RarityChips value={filter} onChange={v => setUi({ collFilter: v })} />
      {items.length > 0 && (
        <button className="btn2" style={{ marginTop: 12 }} onClick={() => setUi({ sellAllOpen: true })}>
          <span>Продать все</span>
          <span className="val tnum" style={{ fontSize: 15 }}>
            <Coin s={14} /><span>{fmt(items.reduce((a, x) => a + instantSellPrice(x.value), 0))}</span>
          </span>
        </button>
      )}
      <div className="list" data-tour="list">
        {items.map(x => (
          <button className="row" key={x.id} onClick={() => setUi({ sheet: x.id })}>
            <span className={'rb t-' + x.rarity}><SimIcon /></span>
            <span className="grow">
              <span className="mono ell" style={{ fontSize: 16, fontWeight: 600 }}>{phone(x.digits)}</span>
              <span className={'c-' + x.rarity} style={{ fontSize: 12, fontWeight: 500 }}>{RARITY[x.rarity].name}</span>
            </span>
            <span className="val tnum"><Coin s={14} /><span>{fmt(x.value)}</span></span>
          </button>
        ))}
        {items.length === 0 && <div className="empty">Пусто</div>}
      </div>
    </div>
  );
}
