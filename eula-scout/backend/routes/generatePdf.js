const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const router = express.Router();

const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Disk storage so Python script can read from a real file path
const storage = multer.diskStorage({
  destination: os.tmpdir(),
  filename: (req, file, cb) => {
    cb(null, `eula_in_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are accepted.'));
    }
    cb(null, true);
  },
});

const SCRIPT_PATH = path.join(__dirname, '..', 'generate_eula_onepager.py');

router.post(
  '/',
  (req, res, next) => {
    upload.single('eulaFile')(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum 10 MB.' });
      }
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const inputPath = req.file.path;
    // Sanitise company name — only allow safe characters
    const company = ((req.body.company || 'Titan Company Ltd') + '').replace(/[^a-zA-Z0-9 .&-]/g, '').slice(0, 80);
    const accent  = /^#[0-9A-Fa-f]{6}$/.test(req.body.accent || '') ? req.body.accent : '#DA1F26';
    const outputPath = path.join(os.tmpdir(), `eula_out_${Date.now()}.pdf`);

    const cleanup = () => {
      try { if (fs.existsSync(inputPath))  fs.unlinkSync(inputPath);  } catch {}
      try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
    };

    // Try 'python' first, fall back to 'python3'
    const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
    const py = spawn(pyCmd, [
      SCRIPT_PATH,
      inputPath,
      '--company', company,
      '--accent',  accent,
      '--output',  outputPath,
    ], {
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
    });

    // Capture stdout too (for debug) and drain to prevent pipe blocking
    let stdout = '';
    py.stdout.on('data', (d) => (stdout += d.toString('utf8')));

    let stderr = '';
    py.stderr.on('data', (d) => (stderr += d.toString('utf8')));

    py.on('close', (code) => {
      // Log to server console so the Node terminal shows what went wrong
      if (code !== 0) {
        console.error('[generate-pdf] Python exit code:', code);
        console.error('[generate-pdf] STDERR:', stderr);
        console.error('[generate-pdf] STDOUT:', stdout.slice(0, 200));
      }
      if (code !== 0 || !fs.existsSync(outputPath)) {
        cleanup();
        // Include full stderr in response so browser console shows the real error
        const detail = stderr.slice(-1000);
        return res.status(500).json({
          error: 'PDF generation failed. Make sure Python and required packages are installed.',
          detail,
        });
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="EULA_Executive_Summary.pdf"');
      const stream = fs.createReadStream(outputPath);
      stream.pipe(res);
      stream.on('end', cleanup);
      stream.on('error', () => { cleanup(); });
    });

    py.on('error', (e) => {
      cleanup();
      res.status(500).json({
        error: 'Python interpreter not found. Ensure Python is installed and in PATH.',
        detail: e.message,
      });
    });
  }
);

module.exports = router;
