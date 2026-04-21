require('dotenv').config();
const express = require('express');
const path = require('path');
const analyzeRouter = require('./routes/analyze');
const generatePdfRouter = require('./routes/generatePdf');
const analyzeMSARouter = require('./routes/analyzeMSA');
const uploadTemplateRouter = require('./routes/uploadTemplate');
const msaReportPdfRouter = require('./routes/msaReportPdf');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');

app.use(express.json());

// API routes
app.use('/api/analyze', analyzeRouter);
app.use('/api/generate-pdf', generatePdfRouter);
app.use('/api/analyze-msa', analyzeMSARouter);
app.use('/api/upload-template', uploadTemplateRouter);
app.use('/api/msa-report-pdf', msaReportPdfRouter);

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
