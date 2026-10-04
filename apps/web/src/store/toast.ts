import { create } from 'zustand';

export interface Toast {
  id: number;
  text: string;
  color: string;
}

interface ToastState {
  toast: Toast | null;
  show(text: string, color: string): void;
}

const LIFETIME_MS = 2600;
let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

export const useToast = create<ToastState>(set => ({
  toast: null,
  show(text, color) {
    set({ toast: { id: ++seq, text, color } });
    clearTimeout(timer);
    timer = setTimeout(() => set({ toast: null }), LIFETIME_MS);
  }
}));

export const toast = (text: string, color: string) => useToast.getState().show(text, color);

export const COLORS = {
  positive: '#5BC98A',
  warning: '#FF9A5C',
  neutral: '#9AA0A8',
  gold: '#F5B83D'
};
