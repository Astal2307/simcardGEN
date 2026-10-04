import { classifyRarity, RARITY, upgradeWinSectors } from '@simrush/shared';
import { useGame } from '../../store/game';
import { useWorkshop } from '../../store/workshop';
import { Keypad, NumberEditor, SimSlot } from './parts';
import { Wheel } from './Wheel';

/** Апгрейд: жертва + желаемый номер → колесо с шансом по разнице редкостей. */
export function UpgradePanel() {
  const st = useWorkshop();
  const sims = useGame(s => s.sims);
  const sacrifice = sims.find(s => s.id === st.sacrificeId);
  const desired = st.desired;
  const rarity = desired ? classifyRarity(desired) : null;
  const win = sacrifice && rarity ? upgradeWinSectors(sacrifice.rarity, rarity) : 0;

  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="ws">
        <span className="lbl">Жертва</span>
        <div data-tour="sacrifice">
          <SimSlot sim={sacrifice} onClick={() => st.set({ picker: { kind: 'sacrifice' } })} disabled={st.spinning} />
        </div>
      </div>

      {desired && rarity && (
        <div className="ws">
          <div className="lr">
            <span className="lbl">Цель</span>
            <span className={'tag t-' + rarity}>{RARITY[rarity].name}</span>
          </div>
          <NumberEditor digits={desired} selected={st.editPos} onSelect={i => st.set({ editPos: i })} disabled={st.spinning} />
          {st.editPos !== null && <Keypad current={desired[st.editPos]} onPick={st.setDesiredDigit} disabled={st.spinning} />}
        </div>
      )}

      {rarity && (sacrifice || st.landed !== null) && (
        <Wheel win={sacrifice ? win : st.wheelWin} rarity={rarity} rotation={st.rotation} spinning={st.spinning} landed={st.landed} />
      )}

      <button className="btn1" data-tour="upgrade-btn" disabled={!sacrifice || !desired || st.spinning} onClick={() => void st.upgrade()}>
        Апгрейд
      </button>
    </div>
  );
}
