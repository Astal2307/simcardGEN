import { useGame } from '../store/game';

/** Таймер, срабатывающий в начале следующего игрового дня (по часам сервера). */
export function createRollover(onRollover: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (nextAt: number) => {
    clearTimeout(timer);
    const serverNow = Date.now() + useGame.getState().clockOffset;
    timer = setTimeout(onRollover, Math.max(1000, nextAt - serverNow + 1000));
  };
}
