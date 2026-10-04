import { useEffect, useState } from 'react';
import { useGame } from '../store/game';

/** Ширина и масштаб карточки SIM на сцене спина (326px — исходная ширина). */
const calcFit = () => Math.min(1, (Math.min(window.innerWidth, 480) - 48) / 326);

export function useFit(): number {
  const [fit, setFit] = useState(calcFit);
  useEffect(() => {
    const onResize = () => setFit(calcFit());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return fit;
}

/** Текущее время сервера, обновляется раз в секунду. */
export function useServerNow(): number {
  const offset = useGame(s => s.clockOffset);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now + offset;
}

/** Секунды до окончания лота. */
export const secondsLeft = (endsAt: number, now: number) => Math.max(0, Math.ceil((endsAt - now) / 1000));
