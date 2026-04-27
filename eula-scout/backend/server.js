require('dotenv').config();
const express = require('express');
const path = require('path');
const { requireAuth } = require('./middleware/auth');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const analyzeRouter = require('./routes/analyze');
const generatePdfRouter = require('./routes/generatePdf');
const analyzeMSARouter = require('./routes/analyzeMSA');
const uploadTemplateRouter = require('./routes/uploadTemplate');
const msaReportPdfRouter = require('./routes/msaReportPdf');
const eulaReportFromJsonRouter = require('./routes/eulaReportFromJson');
const eulaFullReportRouter = require('./routes/eulaFullReport');
const historyRouter = require('./routes/history');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');

app.use(express.json());

// Public routes (no auth)
app.use('/api/auth', authRouter);

// Protected API routes
app.use('/api/users', usersRouter);
app.use('/api/analyze', requireAuth, analyzeRouter);
app.use('/api/generate-pdf', requireAuth, generatePdfRouter);
app.use('/api/analyze-msa', requireAuth, analyzeMSARouter);
app.use('/api/upload-template', requireAuth, uploadTemplateRouter);
app.use('/api/msa-report-pdf', requireAuth, msaReportPdfRouter);
app.use('/api/eula-report-from-json', requireAuth, eulaReportFromJsonRouter);
app.use('/api/eula-full-report', requireAuth, eulaFullReportRouter);
app.use('/api/history', requireAuth, historyRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve built React frontend
app.use(express.static(FRONTEND_DIST));

// SPA fallback — all non-API routes return index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`EULA Scout running at http://localhost:${PORT}`);
});
