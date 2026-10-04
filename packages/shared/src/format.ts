export const fmt = (n: number): string => Math.round(n).toLocaleString('ru-RU');

export const phone = (d: readonly number[]): string =>
  '+7 ' + d.slice(0, 3).join('') + ' ' + d.slice(3, 6).join('') + '-' + d[6] + d[7] + '-' + d[8] + d[9];

export const shortNum = (d: readonly number[]): string => '' + d[6] + d[7] + '-' + d[8] + d[9];

export const mmss = (sec: number): string => Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
