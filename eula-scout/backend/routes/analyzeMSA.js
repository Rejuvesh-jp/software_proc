const express = require('express');
const multer = require('multer');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { parsePdf } = require('../utils/pdfParser');

const router = express.Router();
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    file.mimetype === 'application/pdf' ? cb(null, true) : cb(new Error('Only PDF files are accepted.'));
  },
});

// Path where the stored Titan MSA template text is cached
const TITAN_TEMPLATE_PATH = path.join(__dirname, '..', 'uploads', 'titan_msa_template.txt');

function callGateway(messages) {
  return new Promise((resolve, reject) => {
    const gatewayUrl = new URL(process.env.OPENAI_BASE_URL);
    const basePath = gatewayUrl.pathname.replace(/\/$/, '');
    const body = JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages,
      temperature: 0.2,
    });
    const options = {
      hostname: gatewayUrl.hostname,
      port: gatewayUrl.port || 443,
      path: basePath + '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
        'Content-Length': Buffer.byteLength(body),
      },
      rejectUnauthorized: false,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 401) return reject(Object.assign(new Error('Token expired or invalid. Refresh OPENAI_API_KEY in .env and restart.'), { status: 401 }));
        if (res.statusCode === 429) return reject(Object.assign(new Error('Rate limit reached. Please wait and try again.'), { status: 429 }));
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(Object.assign(new Error(`Gateway error ${res.statusCode}: ${data.slice(0, 200)}`), { status: res.statusCode }));
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Gateway returned non-JSON response: ' + data.slice(0, 200))); }
      });
    });
    req.on('error', (e) => reject(new Error('Connection failed: ' + e.message)));
    req.write(body);
    req.end();
  });
}

const SYSTEM_PROMPT = `You are a senior legal counsel specialising in B2B commercial contracts for a large Indian manufacturing company (Titan Company Limited).
You will be given:
1. TITAN_TEMPLATE: Titan's standard MSA template (the benchmark / preferred position).
2. VENDOR_MSA: A vendor's MSA document to be reviewed.

Your task is to compare the two and return a structured JSON report. Identify every clause where the vendor's terms deviate from Titan's preferred position and flag the risk.

Return ONLY valid JSON in this exact structure — no markdown, no explanation outside the JSON:
{
  "vendorName": "Vendor name extracted from the document",
  "msaTitle": "Document title",
  "effectiveDate": "Effective date if found, else [TBD]",
  "overallRisk": "Low | Medium | High",
  "executiveSummary": "3-4 sentence summary of the vendor MSA vs Titan's template and the key sticking points.",
  "deviations": [
    {
      "clauseRef": "Section number or title",
      "topic": "Short topic name (e.g. Payment Terms, Liability Cap, Governing Law)",
      "titanPosition": "What Titan's template says (brief)",
      "vendorPosition": "What the vendor's MSA says (brief)",
      "risk": "Low | Medium | High",
      "objection": "Plain-English explanation of why this is a problem for Titan",
      "recommendation": "Specific wording or negotiation strategy Titan should push for"
    }
  ],
  "missingClauses": [
    {
      "clause": "Clause name present in Titan template but absent in vendor MSA",
      "importance": "Low | Medium | High",
      "recommendation": "What Titan should insist on inserting"
    }
  ],
  "favorableClauses": [
    {
      "clauseRef": "Section number or title",
      "topic": "Topic",
      "note": "Why this clause is acceptable or better than Titan's template"
    }
  ],
  "topNegotiationPriorities": [
    "Priority 1 action",
    "Priority 2 action",
    "Priority 3 action",
    "Priority 4 action",
    "Priority 5 action"
  ],
  "dataPrivacyRisk": "Summary of DPDPA / GDPR / data localisation concerns in the vendor MSA",
  "liabilityRisk": "Summary of liability cap and indemnification deviations",
  "terminationRisk": "Summary of termination clause differences and risks to Titan"
}`;

// ── GET /api/analyze-msa/template-status ─────────────────────────────────────
// Returns whether a Titan MSA template has been uploaded
router.get('/template-status', (req, res) => {
  const exists = fs.existsSync(TITAN_TEMPLATE_PATH);
  res.json({ templateLoaded: exists });
});

// ── POST /api/analyze-msa ─────────────────────────────────────────────────────
// Accepts vendor MSA PDF and compares against stored Titan template
router.post(
  '/',
  (req, res, next) => {
    upload.single('msaFile')(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum allowed size is 10 MB.' });
      }
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded. Please attach a vendor MSA PDF.' });

    // Load Titan template
    if (!fs.existsSync(TITAN_TEMPLATE_PATH)) {
      return res.status(428).json({
        error: 'Titan MSA template not uploaded yet. Go to Settings → MSA Template and upload your Titan master template first.',
      });
    }
    const titanText = fs.readFileSync(TITAN_TEMPLATE_PATH, 'utf-8');

    // Parse vendor MSA
    let vendorText;
    try {
      const { text } = await parsePdf(req.file.buffer);
      vendorText = text;
    } catch {
      return res.status(422).json({ error: 'Could not read vendor MSA PDF. Please upload a text-based PDF.' });
    }

    if (!vendorText || vendorText.trim().length < 50) {
      return res.status(422).json({ error: 'The vendor MSA PDF appears empty or image-based. Please upload a text-based PDF.' });
    }

    // Truncate both to stay within token limits
    const titanSnippet = titanText.length > 60000 ? titanText.slice(0, 60000) + '\n[truncated]' : titanText;
    const vendorSnippet = vendorText.length > 60000 ? vendorText.slice(0, 60000) + '\n[truncated]' : vendorText;

    const userPrompt =
      `TITAN_TEMPLATE (Titan's standard MSA):\n${titanSnippet}\n\n` +
      `---\n\nVENDOR_MSA (vendor's document to review):\n${vendorSnippet}\n\n` +
      `Return the structured JSON comparison report.`;

    try {
      const completion = await callGateway([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ]);

      const rawContent = completion.choices?.[0]?.message?.content;
      if (!rawContent) throw new Error('Empty response from AI model.');

      let result;
      try {
        // Strip possible markdown code fences
        const cleaned = rawContent.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
        result = JSON.parse(cleaned);
      } catch {
        throw new Error('AI returned malformed JSON. Please try again.');
      }

      return res.json(result);
    } catch (apiErr) {
      console.error('MSA analyze error:', apiErr);
      if (apiErr.status === 401) return res.status(502).json({ error: 'Token expired. Refresh OPENAI_API_KEY in .env and restart server.' });
      if (apiErr.status === 429) return res.status(429).json({ error: 'API rate limit reached. Please wait and try again.' });
      return res.status(502).json({ error: 'AI analysis failed. ' + (apiErr.message || '') });
    }
  }
);

module.exports = router;
