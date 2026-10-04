import { create } from 'zustand';
import { isRarity, RARITY, SPIN_COST, type AlbumHitDTO, type PityDTO, type Rarity, type SimDTO } from '@simrush/shared';
import { api } from '../../api/endpoints';
import { attempt, useGame } from '../../store/game';
import { useUpgrades } from '../../store/upgrades';
import { useAlbum } from '../../store/album';
import { vibrate } from '../../lib/haptics';

/** Тайминги анимации, мс: первая цифра фиксируется через LOCK0, дальше каждые LOCK_STEP. */
const LOCK0 = 450;
const LOCK_STEP = 185;
const SPIN_END = 2250;
const FRAME_MS = 50;
const RECENT_LIMIT = 4;

export interface Particle {
  a: number;
  cls: string;
  delay: number;
  color: string;
}

interface SpinState {
  spinning: boolean;
  /** Сколько цифр уже зафиксировано. */
  locked: number;
  /** Случайные цифры «барабана». */
  roll: number[];
  /** Результат, полученный от сервера (во время вращения). */
  pending: SimDTO | null;
  result: SimDTO | null;
  showFx: boolean;
  countVal: number;
  particles: Particle[];
  fxKey: number;
  recent: SimDTO[];
  /** Сколько номеров раскрыто за сессию (для обучения). */
  revealed: number;
  spin(): Promise<void>;
}

const ri = (n: number) => Math.floor(Math.random() * n);
const randDigits = () => Array.from({ length: 10 }, () => ri(10));

function makeParticles(r: Rarity): Particle[] {
  const n = r === 'legendary' ? 30 : r === 'epic' ? 18 : 0;
  const cls = ['fa', 'fb', 'fc'];
  return Array.from({ length: n }, (_, i) => ({
    a: Math.round(i * (360 / n) + ri(12)),
    cls: cls[ri(3)],
    delay: ri(140),
    color: r === 'legendary' && i % 3 === 0 ? '#FFF1D2' : RARITY[r].color
  }));
}

const VIBRATION: Partial<Record<Rarity, number | number[]>> = {
  uncommon: 15,
  rare: [20, 40, 20],
  epic: [30, 40, 30, 40, 30],
  legendary: [40, 30, 40, 30, 120]
};

// ?r=legendary в адресе — принудительная редкость для демо (сервер учитывает только в dev)
const forcedParam = new URLSearchParams(location.search).get('r');
const FORCED: Rarity | undefined = isRarity(forcedParam) ? forcedParam : undefined;

let rollTimer: ReturnType<typeof setInterval> | undefined;
let countTimer: ReturnType<typeof setInterval> | undefined;
/** Счётчики гарантий из ответа спина — показываем после раскрытия, чтобы не выдать результат заранее. */
let pendingPity: PityDTO[] | null = null;
let pendingAlbum: AlbumHitDTO[] = [];

export const useSpin = create<SpinState>((set, get) => {
  function reveal(sim: SimDTO) {
    const vib = VIBRATION[sim.rarity];
    if (vib) vibrate(vib);
    set(s => ({
      spinning: false, locked: 10, pending: null, result: sim, showFx: true,
      particles: makeParticles(sim.rarity), fxKey: s.fxKey + 1,
      recent: [sim, ...s.recent].slice(0, RECENT_LIMIT),
      revealed: s.revealed + 1
    }));
    useGame.getState().addSim(sim);
    if (pendingPity) useUpgrades.getState().setPity(pendingPity);
    useAlbum.getState().applyHits(pendingAlbum);
    pendingAlbum = [];

    const t0 = performance.now();
    const dur = sim.rarity === 'legendary' ? 1100 : 700;
    countTimer = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      set({ countVal: Math.round(sim.value * eased) });
      if (k >= 1) clearInterval(countTimer);
    }, 30);
  }

  return {
    spinning: false,
    locked: 0,
    roll: randDigits(),
    pending: null,
    result: null,
    showFx: false,
    countVal: 0,
    particles: [],
    fxKey: 0,
    recent: [],
    revealed: 0,

    async spin() {
      if (get().spinning || useGame.getState().balance < SPIN_COST) return;
      clearInterval(rollTimer);
      clearInterval(countTimer);
      vibrate(8);
      set({ spinning: true, pending: null, locked: 0, roll: randDigits(), showFx: false, countVal: 0 });

      // Барабан крутится сразу; фиксация цифр начинается, когда пришёл ответ сервера
      const t0 = performance.now();
      let lockFrom = 0;
      rollTimer = setInterval(() => {
        const sim = get().pending;
        if (!sim) return set({ roll: randDigits() });
        const t = performance.now() - t0 - lockFrom;
        if (t >= SPIN_END - LOCK0) {
          clearInterval(rollTimer);
          reveal(sim);
          return;
        }
        let locked = 0;
        for (let i = 0; i < 10; i++) if (t >= i * LOCK_STEP) locked = i + 1;
        set({ locked, roll: randDigits() });
      }, FRAME_MS);

      const ok = await attempt(async () => {
        const { sim, balance, pity, album } = await api.spin(FORCED);
        pendingPity = pity;
        pendingAlbum = album;
        useGame.getState().setBalance(balance);
        lockFrom = Math.max(LOCK0, performance.now() - t0);
        set({ pending: sim });
      });
      if (!ok) {
        clearInterval(rollTimer);
        set({ spinning: false, locked: 0 });
      }
    }
  };
});
