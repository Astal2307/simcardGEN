import type { DatabaseSync } from 'node:sqlite';

/** Миграции применяются по порядку; номер версии хранится в PRAGMA user_version. */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    token       TEXT    NOT NULL UNIQUE,
    name        TEXT    NOT NULL,
    balance     INTEGER NOT NULL CHECK (balance >= 0),
    created_at  INTEGER NOT NULL
  );

  -- status: owned (в коллекции) | listed (на аукционе) | gone (продан системе / ушёл боту)
  CREATE TABLE sims (
    id           TEXT    PRIMARY KEY,
    owner_id     INTEGER REFERENCES users(id),
    digits       TEXT    NOT NULL,
    rarity       TEXT    NOT NULL,
    value        INTEGER NOT NULL,
    status       TEXT    NOT NULL,
    acquired_at  INTEGER NOT NULL
  );
  CREATE INDEX sims_owner ON sims(owner_id, status);

  -- seller_id / leader_id = NULL означает бота
  CREATE TABLE lots (
    id           TEXT    PRIMARY KEY,
    sim_id       TEXT    NOT NULL REFERENCES sims(id),
    seller_id    INTEGER REFERENCES users(id),
    seller_name  TEXT    NOT NULL,
    bid          INTEGER NOT NULL,
    step         INTEGER NOT NULL,
    bids         INTEGER NOT NULL,
    leader_id    INTEGER REFERENCES users(id),
    leader_name  TEXT,
    ends_at      INTEGER NOT NULL,
    status       TEXT    NOT NULL,
    created_at   INTEGER NOT NULL
  );
  CREATE INDEX lots_status ON lots(status, ends_at);
  `,
  `
  -- ежедневный бонус: день серии последнего получения (1…7) и номер игрового дня, когда он получен
  ALTER TABLE users ADD COLUMN bonus_streak INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE users ADD COLUMN bonus_last_day INTEGER;
  `,
  `
  -- ежедневные задания; day — номер игрового дня
  CREATE TABLE quests (
    id        TEXT    PRIMARY KEY,
    user_id   INTEGER NOT NULL REFERENCES users(id),
    day       INTEGER NOT NULL,
    slot      INTEGER NOT NULL,
    kind      TEXT    NOT NULL,
    target    INTEGER NOT NULL,
    progress  INTEGER NOT NULL DEFAULT 0,
    reward    INTEGER NOT NULL,
    claimed   INTEGER NOT NULL DEFAULT 0,
    UNIQUE (user_id, day, slot),
    UNIQUE (user_id, day, kind)
  );
  `,
  `
  -- купленные апгрейды гарантий
  CREATE TABLE user_upgrades (
    user_id     INTEGER NOT NULL REFERENCES users(id),
    upgrade_id  TEXT    NOT NULL,
    bought_at   INTEGER NOT NULL,
    PRIMARY KEY (user_id, upgrade_id)
  );
  -- счётчики круток для гарантий, по тиру
  CREATE TABLE pity (
    user_id  INTEGER NOT NULL REFERENCES users(id),
    tier     INTEGER NOT NULL,
    count    INTEGER NOT NULL,
    PRIMARY KEY (user_id, tier)
  );
  `,
  `
  -- коллекции: закрытые ячейки и номер, который их закрыл первым
  CREATE TABLE album (
    user_id        INTEGER NOT NULL REFERENCES users(id),
    collection_id  TEXT    NOT NULL,
    slot_key       TEXT    NOT NULL,
    sim_id         TEXT    NOT NULL,
    filled_at      INTEGER NOT NULL,
    PRIMARY KEY (user_id, collection_id, slot_key)
  );
  `,
  `
  -- полученные награды за собранные коллекции
  CREATE TABLE album_rewards (
    user_id        INTEGER NOT NULL REFERENCES users(id),
    collection_id  TEXT    NOT NULL,
    claimed_at     INTEGER NOT NULL,
    PRIMARY KEY (user_id, collection_id)
  );
  `,
  `
  -- шаг обучения: у уже существующих игроков считается пройденным (-1)
  ALTER TABLE users ADD COLUMN tutorial_step INTEGER NOT NULL DEFAULT -1;
  `,
  `
  -- первый апгрейд номера гарантированно выигрывает; у существующих игроков — уже нет
  ALTER TABLE users ADD COLUMN free_upgrade INTEGER NOT NULL DEFAULT 0;
  `
];

export function migrate(db: DatabaseSync): void {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number };
  for (let v = row.user_version; v < MIGRATIONS.length; v++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}
