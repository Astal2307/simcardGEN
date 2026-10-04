import { create } from 'zustand';
import { TUTORIAL_DONE } from '@simrush/shared';
import { api } from '../../api/endpoints';
import { useUi } from '../../store/ui';
import { useWorkshop } from '../../store/workshop';
import { STEPS } from './steps';

interface TutorialState {
  step: number;
  active: boolean;
  /** Запуск по прогрессу с сервера; `?tutorial` в адресе запускает заново. */
  init(serverStep: number): void;
  next(): void;
  finish(): void;
}

const save = (step: number) => void api.saveTutorial(step).catch(() => {});

export const useTutorial = create<TutorialState>((set, get) => ({
  step: TUTORIAL_DONE,
  active: false,

  init(serverStep) {
    const forced = new URLSearchParams(location.search).has('tutorial');
    const step = forced ? 0 : serverStep;
    if (step === TUTORIAL_DONE || step >= STEPS.length) return;
    set({ step, active: true });
    if (forced) save(0);
  },

  next() {
    const step = get().step + 1;
    if (step >= STEPS.length) return get().finish();
    set({ step });
    save(step);
  },

  finish() {
    set({ step: TUTORIAL_DONE, active: false });
    save(TUTORIAL_DONE);
    useUi.getState().set({ rewardsOpen: false, tab: 'spin' });
    useWorkshop.getState().set({ tourFilter: null, picker: null });
  }
}));
