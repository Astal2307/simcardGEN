import { config } from './config';
import { createContainer } from './container';
import { openDatabase } from './db/database';
import { buildHttp } from './http/server';
import { RealtimeHub } from './realtime/hub';

const db = openDatabase(config.dbFile);
const hub = new RealtimeHub();
const app = createContainer({ db, notifier: hub, allowForcedRarity: config.allowForcedRarity, gameTzOffsetMin: config.gameTzOffsetMin });
const http = await buildHttp(app, hub, { logger: true, webDist: config.webDist, corsOrigins: config.corsOrigins });

app.market.ensureMarketLots();
const ticker = setInterval(() => {
  try {
    app.market.tick();
  } catch (err) {
    http.log.error(err, 'market tick failed');
  }
}, config.tickMs);

async function shutdown(signal: string) {
  http.log.info(`${signal}: shutting down`);
  clearInterval(ticker);
  hub.close();
  await http.close();
  db.close();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

await http.listen({ port: config.port, host: config.host });
