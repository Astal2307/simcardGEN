import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const here = fileURLToPath(new URL('.', import.meta.url));
const isProd = process.env.NODE_ENV === 'production';

export const config = {
  isProd,
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  dbFile: process.env.DB_FILE ?? resolve(here, '../data/simrush.db'),
  /** Собранный фронтенд; и из src/, и из dist/ путь одинаковый. */
  webDist: process.env.WEB_DIST ?? resolve(here, '../../web/dist'),
  /** Разрешить ?r=<rarity> для принудительной редкости (демо). */
  allowForcedRarity: process.env.ALLOW_FORCED_RARITY ? process.env.ALLOW_FORCED_RARITY === '1' : !isProd,
  /** Смещение часового пояса, в полночь которого сменяется игровой день (бонус, задания), мин. */
  gameTzOffsetMin: Number(process.env.GAME_TZ_OFFSET_MIN ?? 180),
  /** Разрешённые источники для CORS (фронт на другом домене, напр. GitHub Pages), через запятую. */
  corsOrigins: (process.env.CORS_ORIGIN ?? '').split(',').map(s => s.trim()).filter(Boolean),
  tickMs: 1000
};

export type Config = typeof config;
