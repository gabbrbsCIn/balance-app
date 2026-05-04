import { SQLiteDatabase } from 'expo-sqlite';

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM _migrations ORDER BY version'
  );
  const appliedVersions = new Set(applied.map((r) => r.version));

  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      await db.execAsync(migration.sql);
      await db.runAsync(
        'INSERT INTO _migrations (version, applied_at) VALUES (?, ?)',
        [migration.version, new Date().toISOString()]
      );
    }
  }
}

const MIGRATIONS = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS settings (
        id              INTEGER PRIMARY KEY DEFAULT 1,
        condo_name      TEXT NOT NULL DEFAULT 'Meu Condomínio',
        closing_day     INTEGER NOT NULL DEFAULT 25,
        anthropic_key   TEXT,
        updated_at      TEXT NOT NULL
      );

      INSERT OR IGNORE INTO settings (id, condo_name, closing_day, updated_at)
      VALUES (1, 'Meu Condomínio', 25, datetime('now'));

      CREATE TABLE IF NOT EXISTS periods (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        label           TEXT NOT NULL,
        start_date      TEXT NOT NULL,
        end_date        TEXT NOT NULL,
        is_closed       INTEGER NOT NULL DEFAULT 0,
        created_at      TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        period_id       INTEGER NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
        date            TEXT NOT NULL,
        description     TEXT NOT NULL,
        amount          REAL NOT NULL,
        type            TEXT NOT NULL CHECK(type IN ('revenue','expense')),
        source          TEXT NOT NULL DEFAULT 'manual',
        created_at      TEXT NOT NULL,
        updated_at      TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_period ON transactions(period_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date   ON transactions(date);

      CREATE TABLE IF NOT EXISTS photos (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        period_id       INTEGER NOT NULL REFERENCES periods(id),
        uri             TEXT NOT NULL,
        ai_raw_response TEXT,
        created_at      TEXT NOT NULL
      );
    `,
  },
  {
    version: 2,
    sql: `
      ALTER TABLE settings ADD COLUMN ollama_url TEXT NOT NULL DEFAULT 'https://ollama.com';
      ALTER TABLE settings ADD COLUMN ollama_model TEXT NOT NULL DEFAULT 'gemma3:4b';
    `,
  },
  {
    version: 3,
    sql: `ALTER TABLE settings ADD COLUMN ollama_api_key TEXT;`,
  },
  {
    version: 4,
    sql: `UPDATE settings SET ollama_model = 'gemma3:4b' WHERE ollama_model IN ('glm-ocr', 'deepseek-ocr', 'llava', 'llava-llama3', 'moondream');`,
  },
  {
    version: 5,
    sql: `
      ALTER TABLE periods ADD COLUMN is_current INTEGER NOT NULL DEFAULT 0;
      UPDATE periods SET is_current = 1 WHERE id = (
        SELECT id FROM periods WHERE is_closed = 0 ORDER BY id DESC LIMIT 1
      );
    `,
  },
  {
    version: 6,
    sql: `UPDATE settings SET ollama_model = 'gemini-3-flash-preview' WHERE ollama_model = 'gemini-3-flash';`,
  },
  {
    version: 7,
    sql: `ALTER TABLE settings ADD COLUMN ai_system_prompt TEXT;`,
  },
];
