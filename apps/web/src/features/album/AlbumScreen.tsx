import { useEffect, useState } from 'react';
import { ALBUM_GROUPS, ALBUMS, fmt, type AlbumDef, type AlbumGroup } from '@simrush/shared';
import { Check, Chevron, Coin } from '../../components/icons';
import { filledCount, slotId, useAlbum } from '../../store/album';
import { useUi } from '../../store/ui';

export const groupRarity = (g: AlbumGroup) => ALBUM_GROUPS.find(x => x.id === g)!.rarity;

export function AlbumScreen() {
  const filled = useAlbum(s => s.filled);
  const refresh = useAlbum(s => s.refresh);
  const filter = useUi(s => s.albumFilter);
  const setUi = useUi(s => s.set);
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  useEffect(() => { void refresh(); }, [refresh]);

  const toggle = (id: string) =>
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const items = ALBUMS.filter(a => filter === 'all' || a.group === filter);
  return (
    <div className="col">
      <div className="chips" style={{ marginTop: 0 }}>
        {[{ id: 'all' as const, name: 'Все' }, ...ALBUM_GROUPS].map(g => (
          <button key={g.id} className={'chip-f' + (filter === g.id ? ' on' : '')} onClick={() => setUi({ albumFilter: g.id })}>
            {g.id !== 'all' && <span className={'dot bg-' + groupRarity(g.id)} />}
            <span>{g.name}</span>
          </button>
        ))}
      </div>
      <div className="list">
        {items.map(a => (
          <AlbumCard key={a.id} album={a} filled={filled} open={open.has(a.id)} onToggle={() => toggle(a.id)} />
        ))}
      </div>
    </div>
  );
}

function AlbumCard({ album: a, filled, open, onToggle }: { album: AlbumDef; filled: Set<string>; open: boolean; onToggle: () => void }) {
  const claimed = useAlbum(s => s.claimed.has(a.id));
  const claiming = useAlbum(s => s.claiming !== null);
  const claim = useAlbum(s => s.claim);
  const r = groupRarity(a.group);
  const n = filledCount(filled, a.id);
  const full = n === a.slots.length;

  return (
    <div className={'alb' + (full ? ' full' : '')}>
      <div className="alb-h">
        <button className="alb-t" onClick={onToggle} aria-expanded={open}>
          <span className={'dot bg-' + r} />
          <span className="alb-n ell">{a.name}</span>
          {claimed && <Check />}
          {!(full && !claimed) && <span className="alb-c mono">{n}/{a.slots.length}</span>}
        </button>
        {full && !claimed && (
          <button className="bb qb" disabled={claiming} onClick={() => void claim(a.id)}>
            <Coin s={13} c="#0E0F12" />
            <span className="tnum">{fmt(a.reward)}</span>
          </button>
        )}
        <button className="alb-x" onClick={onToggle} aria-label={open ? 'Свернуть' : 'Развернуть'}>
          <Chevron open={open} />
        </button>
      </div>
      <div className="alb-bar"><div className={'bg-' + r} style={{ width: `${(n / a.slots.length) * 100}%` }} /></div>
      {open && (
        <>
          <div className="alb-g" style={{ gridTemplateColumns: `repeat(${a.cols}, minmax(0, 1fr))` }}>
            {a.slots.map(s => (
              <span key={s.key} className={'as mono' + (filled.has(slotId(a.id, s.key)) ? ' t-' + r : '')}>{s.label}</span>
            ))}
          </div>
          {!full && <span className="alb-r val tnum"><Coin s={13} /><span>{fmt(a.reward)}</span></span>}
        </>
      )}
    </div>
  );
}
