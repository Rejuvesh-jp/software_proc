const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const { parsePdf } = require('../utils/pdfParser');

const router = express.Router();
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB — Word docs can be larger

const ALLOWED_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc (legacy)
];

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIMES.includes(file.mimetype) || ext === '.docx' || ext === '.doc' || ext === '.pdf') {
      return cb(null, true);
    }
    cb(new Error('Only PDF or Word (.docx) files are accepted.'));
  },
});

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const TITAN_TEMPLATE_PATH = path.join(UPLOADS_DIR, 'titan_msa_template.txt');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ── POST /api/upload-template ─────────────────────────────────────────────────
// Accepts Titan MSA template PDF, extracts text, stores as .txt for reuse
router.post(
  '/',
  (req, res, next) => {
    upload.single('templateFile')(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum 10 MB.' });
      }
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    let text = '';

    try {
      if (ext === '.docx' || ext === '.doc' ||
          req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          req.file.mimetype === 'application/msword') {
        // Extract text from Word document — mammoth preserves full content
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        text = result.value;
        if (result.messages && result.messages.length > 0) {
          console.log('[template-upload] Mammoth warnings:', result.messages.slice(0, 3));
        }
      } else {
        // PDF extraction
        const parsed = await parsePdf(req.file.buffer);
        text = parsed.text;
      }
    } catch (e) {
      return res.status(422).json({ error: 'Could not extract text from the file: ' + e.message });
    }

    if (!text || text.trim().length < 100) {
      return res.status(422).json({ error: 'The file appears empty or could not be read. Please upload a text-based PDF or .docx file.' });
    }

    try {
      fs.writeFileSync(TITAN_TEMPLATE_PATH, text, 'utf-8');
    } catch (e) {
      return res.status(500).json({ error: 'Could not save template on server.', detail: e.message });
    }

    res.json({
      success: true,
      message: 'Titan MSA template uploaded and stored successfully.',
      pages: text.split('\n').length,
      characters: text.length,
    });
  }
);

// ── DELETE /api/upload-template ───────────────────────────────────────────────
router.delete('/', (req, res) => {
  if (fs.existsSync(TITAN_TEMPLATE_PATH)) {
    fs.unlinkSync(TITAN_TEMPLATE_PATH);
    return res.json({ success: true, message: 'Titan MSA template removed.' });
  }
  res.status(404).json({ error: 'No template found.' });
});

module.exports = router;
