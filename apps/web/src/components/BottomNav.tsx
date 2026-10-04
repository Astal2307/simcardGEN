import type { ReactNode } from 'react';
import type { Tab } from '../store/ui';
import { AlbumTabIcon, AuctionTabIcon, RatingTabIcon, SimIcon, SpinTabIcon, TreeTabIcon } from './icons';

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'spin', label: 'Крутить', icon: <SpinTabIcon /> },
  { id: 'coll', label: 'Номера', icon: <SimIcon w={22} h={22} sw={1.7} /> },
  { id: 'album', label: 'Коллекции', icon: <AlbumTabIcon /> },
  { id: 'auc', label: 'Аукцион', icon: <AuctionTabIcon /> },
  { id: 'upg', label: 'Апгрейды', icon: <TreeTabIcon /> },
  { id: 'rate', label: 'Рейтинг', icon: <RatingTabIcon /> }
];

export function BottomNav({ tab, onChange, dots }: { tab: Tab; onChange: (t: Tab) => void; dots?: Partial<Record<Tab, boolean>> }) {
  return (
    <nav className="nav">
      {TABS.map(t => (
        <button key={t.id} data-tour={'nav-' + t.id} className={'nb' + (tab === t.id ? ' on' : '')} onClick={() => onChange(t.id)}>
          {t.icon}
          {dots?.[t.id] && <span className="nb-dot" />}
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
