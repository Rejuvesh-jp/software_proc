require('dotenv').config();
const pool = require('./db');

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
  `);
  console.log('✓ Sessions table created');
  await pool.end();
}

migrate().catch(e => { console.error(e.message); process.exit(1); });
