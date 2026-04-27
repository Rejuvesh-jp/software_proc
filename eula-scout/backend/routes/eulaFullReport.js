const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const router = express.Router();
const SCRIPT_PATH = path.join(__dirname, '..', 'generate_eula_full_report.py');

router.post('/', express.json({ limit: '2mb' }), (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object' || !data.softwareName) {
    return res.status(400).json({ error: 'Invalid EULA analysis data.' });
  }

  const ts = Date.now();
  const jsonPath   = path.join(os.tmpdir(), `eula_full_${ts}.json`);
  const outputPath = path.join(os.tmpdir(), `eula_full_report_${ts}.pdf`);

  const cleanup = () => {
    try { if (fs.existsSync(jsonPath))   fs.unlinkSync(jsonPath);   } catch {}
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
  };

  try {
    fs.writeFileSync(jsonPath, JSON.stringify(data), 'utf-8');
  } catch (e) {
    return res.status(500).json({ error: 'Could not write temp file.', detail: e.message });
  }

  const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
  const py = spawn(pyCmd, [SCRIPT_PATH, jsonPath, '--output', outputPath], {
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
  });

  let stderr = '';
  py.stderr.on('data', (d) => (stderr += d.toString('utf8')));

  py.on('close', (code) => {
    if (code !== 0 || !fs.existsSync(outputPath)) {
      console.error('[eula-full-report] Python exit:', code, stderr.slice(-400));
      cleanup();
      return res.status(500).json({ error: 'PDF generation failed.', detail: stderr.slice(-600) });
    }
    const safeName = (data.softwareName || 'EULA')
      .replace(/[^a-zA-Z0-9 _-]/g, '')
      .replace(/\s+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_Full_Report.pdf"`);
    const stream = fs.createReadStream(outputPath);
    stream.pipe(res);
    stream.on('end', cleanup);
    stream.on('error', cleanup);
  });

  py.on('error', (e) => {
    cleanup();
    res.status(500).json({ error: 'Could not launch Python.', detail: e.message });
  });
});

module.exports = router;
