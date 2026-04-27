require('dotenv').config();
const pool = require('./db');
const bcrypt = require('bcryptjs');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        email         VARCHAR(255) UNIQUE NOT NULL,
        name          VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active     BOOLEAN NOT NULL DEFAULT true,
        created_by    INTEGER REFERENCES users(id),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login    TIMESTAMPTZ
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);

    // Seed the first admin user
    const email = 'rejuveshj@titan.co.in';
    const name  = 'Rejuvesh J';
    const plain = 'Reju123jp@';

    const existing = await client.query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.rows.length === 0) {
      const hash = await bcrypt.hash(plain, 12);
      await client.query(
        'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)',
        [email, name, hash]
      );
      console.log(`✓ User created: ${email}`);
    } else {
      console.log(`✓ User already exists: ${email}`);
    }

    await client.query('COMMIT');
    console.log('✓ Migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
