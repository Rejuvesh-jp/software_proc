const express = require('express');
const db = require('../db');

const router = express.Router();

// ── GET /api/history/eula ─────────────────────────────────────────────────────
router.get('/eula', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, software_name, vendor, eula_version, overall_risk_level, analyzed_at, result
       FROM eula_analyses
       ORDER BY analyzed_at DESC
       LIMIT 200`
    );
    // Shape each row to match what the frontend expects
    const history = rows.map((r) => ({
      id:               r.id,
      softwareName:     r.software_name,
      vendor:           r.vendor,
      eulaVersion:      r.eula_version,
      overallRiskLevel: r.overall_risk_level,
      analyzedAt:       r.analyzed_at,
      result:           r.result,
    }));
    res.json(history);
  } catch (e) {
    console.error('[history/eula GET]', e.message);
    res.status(500).json({ error: 'Could not load EULA history.' });
  }
});

// ── DELETE /api/history/eula ──────────────────────────────────────────────────
router.delete('/eula', async (req, res) => {
  try {
    await db.query('DELETE FROM eula_analyses');
    res.json({ ok: true });
  } catch (e) {
    console.error('[history/eula DELETE ALL]', e.message);
    res.status(500).json({ error: 'Could not clear EULA history.' });
  }
});

// ── DELETE /api/history/eula/:id ──────────────────────────────────────────────
router.delete('/eula/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM eula_analyses WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('[history/eula DELETE one]', e.message);
    res.status(500).json({ error: 'Could not delete record.' });
  }
});

// ── GET /api/history/msa ──────────────────────────────────────────────────────
router.get('/msa', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, msa_title, vendor_name, overall_risk, analyzed_at, result
       FROM msa_reviews
       ORDER BY analyzed_at DESC
       LIMIT 200`
    );
    const history = rows.map((r) => ({
      id:          r.id,
      msaTitle:    r.msa_title,
      vendorName:  r.vendor_name,
      overallRisk: r.overall_risk,
      analyzedAt:  r.analyzed_at,
      result:      r.result,
    }));
    res.json(history);
  } catch (e) {
    console.error('[history/msa GET]', e.message);
    res.status(500).json({ error: 'Could not load MSA history.' });
  }
});

// ── DELETE /api/history/msa ───────────────────────────────────────────────────
router.delete('/msa', async (req, res) => {
  try {
    await db.query('DELETE FROM msa_reviews');
    res.json({ ok: true });
  } catch (e) {
    console.error('[history/msa DELETE ALL]', e.message);
    res.status(500).json({ error: 'Could not clear MSA history.' });
  }
});

// ── DELETE /api/history/msa/:id ───────────────────────────────────────────────
router.delete('/msa/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM msa_reviews WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('[history/msa DELETE one]', e.message);
    res.status(500).json({ error: 'Could not delete record.' });
  }
});

module.exports = router;
