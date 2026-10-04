import { RARITIES, RARITY } from '@simrush/shared';
import type { RarityFilter } from '../store/ui';

const OPTIONS: { k: RarityFilter; label: string }[] = [
  { k: 'all', label: 'Все' },
  ...RARITIES.map(r => ({ k: r, label: RARITY[r].name }))
];

export function RarityChips({ value, onChange }: { value: RarityFilter; onChange: (v: RarityFilter) => void }) {
  return (
    <div className="chips">
      {OPTIONS.map(c => (
        <button key={c.k} className={'chip-f' + (value === c.k ? ' on' : '')} onClick={() => onChange(c.k)}>
          {c.k !== 'all' && <span className={'dot bg-' + c.k} />}
          <span>{c.label}</span>
        </button>
      ))}
    </div>
  );
}
