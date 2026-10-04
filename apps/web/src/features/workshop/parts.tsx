import type { ReactNode } from 'react';
import { phone, shortNum, type SimDTO } from '@simrush/shared';
import { Plus, SimIcon } from '../../components/icons';

/** Номер по цифрам с выбором позиции: +7 9XX XXX-XX-XX. Первая цифра (9) не редактируется. */
export function NumberEditor({ digits, selected, changed, mask, onSelect, disabled }: {
  digits: number[];
  selected: number | null;
  /** Позиция, где вместо цифры показывается «?». */
  mask?: number | null;
  changed?: (i: number) => boolean;
  onSelect: (i: number) => void;
  disabled?: boolean;
}) {
  const cells: ReactNode[] = [];
  digits.forEach((d, i) => {
    const cls = 'ne-c' + (i === 0 ? ' lock' : '') + (i === selected ? ' sel' : '') + (changed?.(i) ? ' chg' : '');
    cells.push(
      <button key={i} className={cls} disabled={disabled || i === 0} onClick={() => onSelect(i)}>{i === mask ? '?' : d}</button>
    );
    if (i === 2) cells.push(<span key="gp" className="ne-g" />);
    if (i === 5 || i === 7) cells.push(<span key={'s' + i} className="ne-s">-</span>);
  });
  return (
    <div className="ne mono">
      <span className="ne-p">+7</span>
      {cells}
    </div>
  );
}

export function Keypad({ current, onPick, disabled }: { current?: number | null; onPick: (d: number) => void; disabled?: boolean }) {
  return (
    <div className="kp">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => (
        <button key={d} className={'kp-k mono' + (current === d ? ' on' : '')} disabled={disabled} onClick={() => onPick(d)}>{d}</button>
      ))}
    </div>
  );
}

/** Слот номера: пустой — «+», заполненный — номер с редкостью. */
export function SimSlot({ sim, onClick, onRemove, compact, disabled }: {
  sim?: SimDTO;
  onClick: () => void;
  /** Если задан — на заполненном слоте есть «×», убирающий номер. */
  onRemove?: () => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  if (!sim) {
    const empty = (
      <button className={'slot empty' + (compact ? ' sm' : '')} onClick={onClick} disabled={disabled} aria-label="Выбрать номер">
        <Plus />
      </button>
    );
    // компактные слоты в обёртке — выравнивание с заполненными (у них место под «×»)
    return compact && onRemove ? <div className="slot-w">{empty}</div> : empty;
  }
  if (compact) {
    return (
      <div className="slot-w">
        <button className={'slot sm t-' + sim.rarity} onClick={onClick} disabled={disabled}>
          <span className={'dot bg-' + sim.rarity} />
          <span className="mono">{shortNum(sim.digits)}</span>
        </button>
        {onRemove && (
          <button className="slot-x" onClick={onRemove} disabled={disabled} aria-label="Убрать">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ECEDEF" strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        )}
      </div>
    );
  }
  return (
    <button className="slot" onClick={onClick} disabled={disabled}>
      <span className={'rb t-' + sim.rarity}><SimIcon /></span>
      <span className="mono ell slot-n">{phone(sim.digits)}</span>
    </button>
  );
}
