export const DAY_MS = 86_400_000;

/** Игровые сутки: сменяются в полночь заданного часового пояса. */
export class GameCalendar {
  constructor(private readonly tzOffsetMin: number) {}

  /** Порядковый номер игрового дня для момента времени. */
  dayOf(ts: number): number {
    return Math.floor((ts + this.tzOffsetMin * 60_000) / DAY_MS);
  }

  /** Момент начала игрового дня, мс UTC. */
  startOf(day: number): number {
    return day * DAY_MS - this.tzOffsetMin * 60_000;
  }
}
