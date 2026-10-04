import { useGame } from '../../store/game';
import { useWorkshop } from '../../store/workshop';
import { NumberEditor, SimSlot } from './parts';

/** Крафт: три номера одной редкости → случайная цифра на выбранной позиции четвёртого. */
export function CraftPanel() {
  const st = useWorkshop();
  const sims = useGame(s => s.sims);
  const target = sims.find(s => s.id === st.targetId);
  const burns = st.burnIds.map(id => sims.find(s => s.id === id));
  const ready = !!target && st.position !== null && burns.every(Boolean) && !st.crafting;

  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="ws">
        <span className="lbl">Номер</span>
        <div data-tour="craft-target">
          <SimSlot sim={target} onClick={() => st.set({ picker: { kind: 'target' } })} disabled={st.crafting} />
        </div>
        {target && (
          <NumberEditor
            digits={target.digits}
            selected={st.position}
            mask={st.position}
            changed={i => i === st.craftedPos}
            onSelect={st.selectCraftPos}
            disabled={st.crafting}
          />
        )}
      </div>

      <div className="ws">
        <span className="lbl">Сжечь</span>
        <div className="grid3" data-tour="burns">
          {burns.map((b, i) => (
            <SimSlot
              key={i}
              compact
              sim={b}
              onClick={() => st.set({ picker: { kind: 'burn', slot: i } })}
              onRemove={() => st.set({ burnIds: st.burnIds.map((id, j) => (j === i ? null : id)) })}
              disabled={st.crafting}
            />
          ))}
        </div>
      </div>

      <button className="btn1" data-tour="craft-btn" disabled={!ready} onClick={() => void st.craft()}>Крафт</button>
    </div>
  );
}
