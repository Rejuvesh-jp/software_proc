const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, name, password_hash, is_active FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );

    const user = result.rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Update last_login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    // Create a new session
    const sessionResult = await pool.query(
      'INSERT INTO sessions (user_id) VALUES ($1) RETURNING id',
      [user.id]
    );
    const sessionId = sessionResult.rows[0].id;

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, sessionId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error('[auth/login]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/auth/logout — delete session from DB
router.post('/logout', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM sessions WHERE id = $1', [req.user.sessionId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[auth/logout]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/auth/me — verify token + session still active
router.get('/me', async (req, res) => {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload.sessionId) return res.status(401).json({ error: 'Session expired.' });

    const { rows } = await pool.query(
      'SELECT id FROM sessions WHERE id = $1 AND user_id = $2',
      [payload.sessionId, payload.id]
    );
    if (!rows.length) return res.status(401).json({ error: 'Session not found.' });

    res.json({ user: { id: payload.id, email: payload.email, name: payload.name } });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
});

module.exports = router;
