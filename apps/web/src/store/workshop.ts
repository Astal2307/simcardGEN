import { create } from 'zustand';
import {
  canCraft, classifyRarity, CRAFT_BURN_COUNT, RARITY, shortNum, upgradeWinSectors, WHEEL_SECTORS, type Rarity, type SimDTO
} from '@simrush/shared';
import { api } from '../api/endpoints';
import { vibrate } from '../lib/haptics';
import { useAlbum } from './album';
import { attempt, useGame } from './game';
import { COLORS, toast } from './toast';

export const WHEEL_SPIN_MS = 4200;

export type PickerKind = { kind: 'target' } | { kind: 'burn'; slot: number } | { kind: 'sacrifice' };

interface WorkshopState {
  // крафт
  targetId: string | null;
  burnIds: (string | null)[];
  /** Выбранная позиция (1…9); цифру выбирает сервер. */
  position: number | null;
  /** Позиция, изменённая последним крафтом, — для подсветки. */
  craftedPos: number | null;
  crafting: boolean;

  // апгрейд
  sacrificeId: string | null;
  desired: number[] | null;
  editPos: number | null;
  spinning: boolean;
  /** Текущий поворот колеса, градусы (накапливается). */
  rotation: number;
  landed: number | null;
  /** Выигрышные сектора последней прокрутки — колесо сохраняет раскладку после сгорания жертвы. */
  wheelWin: number;

  picker: PickerKind | null;

  /** Ограничение редкостей в выборе номера (обучение: чтобы крафт гарантированно сложился). */
  tourFilter: { target: Rarity[]; burn: Rarity[] } | null;
  /** Счётчики завершённых действий за сессию (для обучения). */
  craftCount: number;
  upgradeCount: number;

  set(patch: Partial<WorkshopState>): void;
  pick(sim: SimDTO): void;
  selectCraftPos(pos: number): void;
  craft(): Promise<void>;
  setDesiredDigit(d: number): void;
  upgrade(): Promise<void>;
}

const simById = (id: string | null) => (id ? useGame.getState().sims.find(s => s.id === id) : undefined);

/** Номера, которые можно положить в выбранный слот. */
export function pickerOptions(st: WorkshopState, sims: SimDTO[]): SimDTO[] {
  const p = st.picker;
  if (!p) return [];
  if (p.kind === 'sacrifice') return sims;
  const f = st.tourFilter;
  if (f) sims = sims.filter(s => (p.kind === 'target' ? f.target : f.burn).includes(s.rarity));
  const byId = (id: string | null) => sims.find(s => s.id === id);
  if (p.kind === 'target') {
    const burns = st.burnIds.map(byId).filter((s): s is SimDTO => !!s);
    return sims.filter(s => !burns.some(b => b.id === s.id) && (burns.length === 0 || canCraft(burns[0].rarity, s.rarity)));
  }
  const target = byId(st.targetId);
  // остальные выбранные жертвы (кроме слота, который сейчас меняем)
  const others = st.burnIds.filter((_, i) => i !== p.slot).map(byId).filter((s): s is SimDTO => !!s);
  return sims.filter(s =>
    s.id !== st.targetId &&
    !others.some(b => b.id === s.id) &&
    (others.length > 0 ? s.rarity === others[0].rarity : !target || canCraft(s.rarity, target.rarity))
  );
}

let spinTimer: ReturnType<typeof setTimeout> | undefined;

export const useWorkshop = create<WorkshopState>((set, get) => ({
  targetId: null,
  burnIds: Array(CRAFT_BURN_COUNT).fill(null),
  position: null,
  craftedPos: null,
  crafting: false,

  sacrificeId: null,
  desired: null,
  editPos: null,
  spinning: false,
  rotation: 0,
  landed: null,
  wheelWin: 0,

  picker: null,
  tourFilter: null,
  craftCount: 0,
  upgradeCount: 0,

  set: patch => set(patch),

  pick(sim) {
    const p = get().picker;
    if (!p) return;
    if (p.kind === 'target') set({ targetId: sim.id, position: null, craftedPos: null });
    else if (p.kind === 'burn') set({ burnIds: get().burnIds.map((id, i) => (i === p.slot ? sim.id : id)) });
    else set({ sacrificeId: sim.id, desired: get().desired ?? [...sim.digits], landed: null });
    set({ picker: null });
  },

  selectCraftPos(pos) {
    if (pos === 0) return;
    set({ position: pos, craftedPos: null });
  },

  async craft() {
    const { targetId, burnIds, position, crafting } = get();
    if (crafting || !targetId || position === null || burnIds.some(id => !id)) return;
    set({ crafting: true });
    await attempt(async () => {
      const { sim, album } = await api.craft({ targetId, burnIds: burnIds as string[], position });
      await useGame.getState().refreshSims();
      set({ burnIds: Array(CRAFT_BURN_COUNT).fill(null), position: null, craftedPos: position });
      vibrate([20, 40, 20]);
      toast('Крафт · ' + shortNum(sim.digits), RARITY[sim.rarity].color);
      set({ craftCount: get().craftCount + 1 });
      useAlbum.getState().applyHits(album);
    });
    set({ crafting: false });
  },

  setDesiredDigit(d) {
    const { desired, editPos } = get();
    if (!desired || editPos === null || editPos === 0) return;
    const next = desired.map((x, i) => (i === editPos ? d : x));
    // набор подряд: курсор переходит к следующей цифре
    set({ desired: next, editPos: editPos < 9 ? editPos + 1 : editPos });
  },

  async upgrade() {
    const { sacrificeId, desired, spinning, rotation } = get();
    if (spinning || !sacrificeId || !desired) return;
    const sacrifice = simById(sacrificeId);
    if (!sacrifice) return;
    set({ spinning: true, landed: null, editPos: null, wheelWin: upgradeWinSectors(sacrifice.rarity, classifyRarity(desired)) });
    const ok = await attempt(async () => {
      const res = await api.upgrade({ sacrificeId, digits: desired });
      // повернуть колесо так, чтобы центр выпавшего сектора встал под стрелку (сверху)
      const step = 360 / WHEEL_SECTORS;
      const center = (res.sector + 0.5) * step + (Math.random() - 0.5) * step * 0.6;
      const delta = (((-center - rotation) % 360) + 360) % 360;
      set({ rotation: rotation + 360 * 5 + delta });
      vibrate(8);

      clearTimeout(spinTimer);
      spinTimer = setTimeout(() => {
        set({ spinning: false, landed: res.sector, sacrificeId: null, upgradeCount: get().upgradeCount + 1 });
        void useGame.getState().refreshSims();
        if (res.win && res.sim) {
          vibrate([30, 40, 30, 40, 30]);
          toast('Апгрейд · ' + shortNum(res.sim.digits), RARITY[res.sim.rarity].color);
          useAlbum.getState().applyHits(res.album);
        } else {
          vibrate(40);
          toast('Сгорел', COLORS.warning);
        }
      }, WHEEL_SPIN_MS);
    });
    if (!ok) set({ spinning: false });
  }
}));


