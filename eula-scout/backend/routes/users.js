const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All user routes require a valid JWT
router.use(requireAuth);

// GET /api/users — list all users
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, is_active, created_at, last_login,
              (SELECT name FROM users u2 WHERE u2.id = users.created_by) AS created_by_name
       FROM users ORDER BY created_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[users/list]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/users — create a new user
router.post('/', async (req, res) => {
  const { email, name, password } = req.body || {};
  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Email, name and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email.trim().toLowerCase()]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, name, password_hash, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, is_active, created_at`,
      [email.trim().toLowerCase(), name.trim(), hash, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[users/create]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/users/:id/deactivate — deactivate a user
router.patch('/:id/deactivate', async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'You cannot deactivate your own account.' });
  }
  try {
    await pool.query('UPDATE users SET is_active=false WHERE id=$1', [targetId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/users/:id/activate — reactivate a user
router.patch('/:id/activate', async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_active=true WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/users/:id/password — change a user's password
router.patch('/:id/password', async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const { password } = req.body || {};
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  // Users can only change their own password
  if (targetId !== req.user.id) {
    return res.status(403).json({ error: 'You can only change your own password.' });
  }
  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, targetId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
