import { useEffect, useRef, useState } from 'react';
import { ALBUM_BY_ID, RARITY, type AlbumHitDTO } from '@simrush/shared';
import { useAlbum } from '../../store/album';
import { useToast } from '../../store/toast';
import { groupRarity } from './AlbumScreen';

const SLIDE_MS = 300;
const FLIGHT_MS = 700;
const STAGGER_MS = 110;
const HOLD_MS = 1100;
const OUT_MS = 250;

/** Анимация новых ячеек коллекций: одна карточка на спин, точки летят с SIM-карты в прогресс-бары. */
export function AlbumFx() {
  const item = useAlbum(s => s.fx[0]);
  const shift = useAlbum(s => s.shiftFx);
  if (!item) return null;
  return <FxCard key={item.id} hits={item.hits} onDone={shift} />;
}

/** Точка квадратичной кривой Безье. */
const bezier = (a: number, c: number, b: number, t: number) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b;

function FxCard({ hits, onDone }: { hits: AlbumHitDTO[]; onDone: () => void }) {
  const toastShown = useToast(s => !!s.toast);
  const [landed, setLanded] = useState<boolean[]>(() => hits.map(() => false));
  const [leaving, setLeaving] = useState(false);
  const bars = useRef<(HTMLDivElement | null)[]>([]);
  const dots = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const flights: Animation[] = [];

    timers.push(setTimeout(() => {
      const app = document.querySelector('.app')!.getBoundingClientRect();
      const src = document.querySelector('.cw')?.getBoundingClientRect();
      // старт — центр SIM-карты на сцене; если игрок на другой вкладке — низ экрана
      const x0 = src ? src.left + src.width / 2 - app.left : app.width / 2;
      const y0 = src ? src.top + src.height / 2 - app.top : app.height - 120;

      hits.forEach((hit, i) => {
        const bar = bars.current[i]!.getBoundingClientRect();
        const x1 = bar.left + (bar.width * hit.filled) / hit.total - app.left;
        const y1 = bar.top + bar.height / 2 - app.top;
        // дуга: контрольная точка уводит траекторию в сторону, у каждой точки — своя
        const side = i % 2 === 0 ? -1 : 1;
        const cx = x0 + (x1 - x0) * 0.2 + side * (50 + i * 12);
        const cy = y1 + (y0 - y1) * 0.35;
        const frames: Keyframe[] = Array.from({ length: 13 }, (_, k) => {
          const t = k / 12;
          const scale = t < 0.15 ? 0.4 + t * 4 : 1 - t * 0.4;
          return { transform: `translate(${bezier(x0, cx, x1, t)}px, ${bezier(y0, cy, y1, t)}px) scale(${scale})`, opacity: k === 0 ? 0 : 1 };
        });
        const flight = dots.current[i]!.animate(frames, {
          duration: FLIGHT_MS, delay: i * STAGGER_MS, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards'
        });
        flight.onfinish = () => {
          dots.current[i]?.animate(
            [{ opacity: 1 }, { opacity: 0, transform: `translate(${x1}px, ${y1}px) scale(1.8)` }],
            { duration: 250, fill: 'forwards' }
          );
          setLanded(prev => prev.map((v, j) => v || j === i));
        };
        flights.push(flight);
      });

      const end = FLIGHT_MS + (hits.length - 1) * STAGGER_MS + HOLD_MS;
      timers.push(setTimeout(() => setLeaving(true), end));
      timers.push(setTimeout(onDone, end + OUT_MS));
    }, SLIDE_MS));

    return () => {
      timers.forEach(clearTimeout);
      flights.forEach(f => f.cancel());
    };
  }, [hits, onDone]);

  return (
    <>
      <div className={'afx' + (leaving ? ' out' : '')} style={{ top: `calc(${toastShown ? 124 : 68}px + var(--st))` }}>
        {hits.map((hit, i) => {
          const def = ALBUM_BY_ID[hit.collection];
          const r = groupRarity(def.group);
          const count = landed[i] ? hit.filled : hit.filled - 1;
          return (
            <div className="afx-row" key={hit.collection + hit.slot}>
              <div className="afx-h">
                <span className="ell">{def.name}</span>
                <span className={'tag t-' + r + (landed[i] ? ' pop' : '')}>{def.slots.find(s => s.key === hit.slot)!.label}</span>
                <span className="afx-c mono">{count}/{hit.total}</span>
              </div>
              <div className="afx-bar" ref={el => { bars.current[i] = el; }}>
                <div className={'bg-' + r} style={{ width: `${(count / hit.total) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      {hits.map((hit, i) => {
        const color = RARITY[groupRarity(ALBUM_BY_ID[hit.collection].group)].color;
        return <div key={i} className="afx-dot" ref={el => { dots.current[i] = el; }} style={{ background: color, color }} />;
      })}
    </>
  );
}
