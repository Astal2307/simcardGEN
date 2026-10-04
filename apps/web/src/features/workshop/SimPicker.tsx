import { phone, RARITY } from '@simrush/shared';
import { Close, SimIcon } from '../../components/icons';
import { useGame } from '../../store/game';
import { pickerOptions, useWorkshop } from '../../store/workshop';

/** Bottom sheet выбора номера для крафта / апгрейда. */
export function SimPicker() {
  const st = useWorkshop();
  const sims = useGame(s => s.sims);
  if (!st.picker) return null;
  const options = pickerOptions(st, sims);
  const close = () => st.set({ picker: null });

  return (
    <>
      <button className="ov" aria-label="Закрыть" onClick={close} />
      <div className="sh tall">
        <div className="grab" />
        <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-10px -10px -14px 0' }}>
          <button className="ib" aria-label="Закрыть" onClick={close}><Close /></button>
        </div>
        <div className="list" style={{ marginTop: 0 }}>
          {options.map(x => (
            <button className="row" key={x.id} onClick={() => st.pick(x)}>
              <span className={'rb t-' + x.rarity}><SimIcon /></span>
              <span className="grow">
                <span className="mono ell" style={{ fontSize: 16, fontWeight: 600 }}>{phone(x.digits)}</span>
                <span className={'c-' + x.rarity} style={{ fontSize: 12, fontWeight: 500 }}>{RARITY[x.rarity].name}</span>
              </span>
            </button>
          ))}
          {options.length === 0 && <div className="empty">Нет подходящих номеров</div>}
        </div>
      </div>
    </>
  );
}
