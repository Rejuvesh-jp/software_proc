const jwt = require('jsonwebtoken');
const pool = require('../db');

// Idle session timeout: 30 minutes
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

async function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  if (!payload.sessionId) {
    // Token from before session system was added — force re-login
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, last_activity FROM sessions WHERE id = $1 AND user_id = $2',
      [payload.sessionId, payload.id]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Session not found. Please log in again.' });
    }

    const idleMs = Date.now() - new Date(rows[0].last_activity).getTime();
    if (idleMs > IDLE_TIMEOUT_MS) {
      await pool.query('DELETE FROM sessions WHERE id = $1', [payload.sessionId]);
      return res.status(401).json({
        error: 'Your session expired due to inactivity. Please log in again.',
        code: 'SESSION_TIMEOUT'
      });
    }

    // Refresh last_activity on every authenticated request
    await pool.query('UPDATE sessions SET last_activity = NOW() WHERE id = $1', [payload.sessionId]);
    req.user = payload;
    next();
  } catch (err) {
    console.error('[requireAuth]', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
}

module.exports = { requireAuth };
