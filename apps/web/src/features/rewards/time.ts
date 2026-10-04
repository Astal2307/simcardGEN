/** Обратный отсчёт в формате ЧЧ:ММ:СС. */
export const hhmmss = (ms: number): string => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
};
