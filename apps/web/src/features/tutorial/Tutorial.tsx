import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useBonus } from '../../store/bonus';
import { useGame } from '../../store/game';
import { useUi } from '../../store/ui';
import { STEPS, type Target, type TourStep } from './steps';
import { useTutorial } from './tutorialStore';

const PAD = 6;
const GAP = 12;
const POLL_MS = 150;

interface Rect { top: number; left: number; width: number; height: number }

/** Пошаговое обучение: затемнение с «окном» на нужный элемент и короткая подсказка. */
export function Tutorial() {
  const active = useTutorial(s => s.active);
  const step = useTutorial(s => s.step);
  const ready = useGame(s => s.status === 'ready');
  if (!active || !ready || !STEPS[step]) return null;
  return <StepView key={step} index={step} step={STEPS[step]} />;
}

/** Элементы цели шага (селектор, несколько селекторов или функция). */
function resolve(target: Target): Element[] {
  if (typeof target === 'function') {
    const el = target();
    return el ? [el] : [];
  }
  return (Array.isArray(target) ? target : [target])
    .map(s => document.querySelector(s))
    .filter((el): el is Element => !!el);
}

/** Объединённый прямоугольник цели относительно .app; пересчитывается каждый кадр (элементы анимируются). */
function useTargetRect(target: Target | undefined): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);
  useEffect(() => {
    if (!target) return;
    let raf = 0;
    let scrolledTo: Element | null = null;
    const loop = () => {
      const app = document.querySelector('.app')?.getBoundingClientRect();
      const els = resolve(target);
      if (app && els.length) {
        // прокрутить к цели один раз (и снова, если цель сменилась)
        if (scrolledTo !== els[0]) {
          scrolledTo = els[0];
          if (!els[0].closest('.sh')) els[0].scrollIntoView({ block: 'nearest' });
        }
        const rs = els.map(e => e.getBoundingClientRect());
        const top = Math.max(Math.min(...rs.map(r => r.top)) - app.top - PAD, 0);
        const left = Math.max(Math.min(...rs.map(r => r.left)) - app.left - PAD, 0);
        const bottom = Math.min(Math.max(...rs.map(r => r.bottom)) - app.top + PAD, app.height);
        const right = Math.min(Math.max(...rs.map(r => r.right)) - app.left + PAD, app.width);
        const next = { top, left, width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) };
        setRect(prev => (prev && prev.top === next.top && prev.left === next.left && prev.width === next.width && prev.height === next.height ? prev : next));
      } else {
        setRect(prev => (prev === null ? prev : null));
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return rect;
}

/** Опрос условия/счётчика (они живут в разных сторах). */
function usePoll<T>(read: () => T, enabled: boolean): T {
  const [value, setValue] = useState(read);
  // функция в ref: иначе частые перерисовки (подсветка двигается) перезапускали бы интервал
  const readRef = useRef(read);
  readRef.current = read;
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setValue(readRef.current()), POLL_MS);
    return () => clearInterval(id);
  }, [enabled]);
  return value;
}

function StepView({ index, step }: { index: number; step: TourStep }) {
  const next = useTutorial(s => s.next);
  const finish = useTutorial(s => s.finish);
  const rect = useTargetRect(step.target);
  const action = step.action;

  // экран, нужный шагу
  useEffect(() => {
    const p = step.prepare;
    if (p) {
      const patch: Record<string, unknown> = {};
      if (p.tab) Object.assign(patch, { tab: p.tab, sheet: null });
      if (p.seg) patch.collSeg = p.seg;
      if (p.rewards !== undefined) patch.rewardsOpen = p.rewards;
      useUi.getState().set(patch);
    }
    step.enter?.();
  }, [step]);

  // нажатие на подсвеченный элемент
  useEffect(() => {
    if (action.kind !== 'tap' || !step.target) return;
    const onClick = (e: MouseEvent) => {
      if (e.target instanceof Node && resolve(step.target!).some(el => el.contains(e.target as Node))) setTimeout(next, 60);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [action.kind, step.target, next]);

  // счётчик действий: ждём прироста на need
  const counter = action.kind === 'count' ? action.counter : () => 0;
  const base = useRef(counter());
  const done = usePoll(() => counter() - base.current, action.kind === 'count');
  const need = action.kind === 'count' ? action.need : 0;
  useEffect(() => {
    if (need && done >= need) {
      const t = setTimeout(next, 900);
      return () => clearTimeout(t);
    }
  }, [done, need, next]);

  // условие
  const check = action.kind === 'until' ? action.check : () => false;
  const met = usePoll(check, action.kind === 'until');
  useEffect(() => {
    if (met) {
      const t = setTimeout(next, 250);
      return () => clearTimeout(t);
    }
  }, [met, next]);

  // бонус: если уже получен до шага — просто «Далее»
  const claimedAtStart = useRef(!!useBonus.getState().bonus?.claimedToday);
  const claimed = useBonus(s => !!s.bonus?.claimedToday);
  useEffect(() => {
    if (action.kind === 'claimBonus' && claimed && !claimedAtStart.current) {
      const t = setTimeout(next, 700);
      return () => clearTimeout(t);
    }
  }, [action.kind, claimed, next]);

  const skippable = usePoll(() => !!step.skipIf?.(), !!step.skipIf);
  const interactive = action.kind === 'tap' || action.kind === 'count' || action.kind === 'until' ||
    (action.kind === 'claimBonus' && !claimedAtStart.current);
  const showNext = action.kind === 'next' || (action.kind === 'claimBonus' && claimedAtStart.current) || skippable;
  const label = action.kind === 'next' && action.label ? action.label : 'Далее';
  const progress = need > 1 ? `${Math.min(done, need)}/${need}` : `${index + 1}/${STEPS.length}`;

  return (
    <>
      {rect ? (
        <>
          <div className="tour-hole" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />
          <Blockers rect={rect} passThrough={interactive} />
        </>
      ) : (
        <div className="tour-full" />
      )}
      <Tip rect={rect}>
        <span className="tour-t">{step.title}</span>
        {step.text && <span className="tour-x">{step.text}</span>}
        <div className="tour-f">
          <span className="tour-n mono">{progress}</span>
          <span className="tour-b">
            <button className="tour-skip" onClick={finish}>Пропустить</button>
            {showNext && <button className="bb qb" onClick={next}>{label}</button>}
          </span>
        </div>
      </Tip>
    </>
  );
}

/** Прозрачные блокирующие области вокруг «окна»; само окно кликабельно только у шагов-действий. */
function Blockers({ rect, passThrough }: { rect: Rect; passThrough: boolean }) {
  const b = (style: CSSProperties, key: string) => <div key={key} className="tour-block" style={style} />;
  if (!passThrough) return b({ inset: 0 }, 'all');
  return (
    <>
      {b({ top: 0, left: 0, right: 0, height: rect.top }, 't')}
      {b({ top: rect.top + rect.height, left: 0, right: 0, bottom: 0 }, 'b')}
      {b({ top: rect.top, left: 0, width: rect.left, height: rect.height }, 'l')}
      {b({ top: rect.top, left: rect.left + rect.width, right: 0, height: rect.height }, 'r')}
    </>
  );
}

/** Подсказка: под целью, если хватает места, иначе над ней; без цели — по центру. */
function Tip({ rect, children }: { rect: Rect | null; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ visibility: 'hidden' });

  useLayoutEffect(() => {
    const app = document.querySelector('.app')?.getBoundingClientRect();
    const h = ref.current?.offsetHeight ?? 0;
    if (!app) return;
    if (!rect) {
      setStyle({ top: Math.max((app.height - h) / 2, 16) });
      return;
    }
    const below = app.height - (rect.top + rect.height) - GAP - 8;
    const above = rect.top - GAP - 8;
    let top: number;
    if (below >= h) top = rect.top + rect.height + GAP;
    else if (above >= h) top = rect.top - h - GAP;
    else top = below >= above ? app.height - h - 8 : 8;
    setStyle({ top });
  }, [rect]);

  return <div ref={ref} className="tour-tip" style={style}>{children}</div>;
}
