const express = require('express');
const multer = require('multer');
const https = require('https');
const { URL } = require('url');
const { parsePdf } = require('../utils/pdfParser');

const router = express.Router();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.memoryStorage();

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

// Raw HTTPS call to support custom gateways with self-signed/internal TLS certs
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
      rejectUnauthorized: false, // allow internal/corporate TLS certs
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 401) {
          return reject(Object.assign(new Error('Token expired or invalid. Refresh OPENAI_API_KEY in .env and restart.'), { status: 401 }));
        }
        if (res.statusCode === 429) {
          return reject(Object.assign(new Error('Rate limit reached. Please wait and try again.'), { status: 429 }));
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(Object.assign(new Error(`Gateway error ${res.statusCode}: ${data.slice(0, 200)}`), { status: res.statusCode }));
        }
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Gateway returned non-JSON response: ' + data.slice(0, 200)));
        }
      });
    });
    req.on('error', (e) => reject(new Error('Connection failed: ' + e.message)));
    req.write(body);
    req.end();
  });
}

const SYSTEM_PROMPT = `You are a legal AI assistant specializing in software procurement and EULA analysis.
When given the text of a software End User License Agreement (EULA), you must return a structured JSON response with:

{
  "softwareName": "Detected software name from the document",
  "vendor": "Vendor or company name",
  "eulaVersion": "Version or date of the EULA if found",
  "overallRiskLevel": "Low | Medium | High",
  "executiveSummary": "3-4 sentence plain-English summary of what this EULA means for a business buyer",
  "keyClauses": [
    {
      "title": "Clause title",
      "summary": "Plain-English explanation",
      "riskLevel": "Low | Medium | High",
      "originalText": "Relevant excerpt from the document"
    }
  ],
  "dataPrivacy": "Summary of data collection, sharing, and privacy implications",
  "intellectualProperty": "Summary of IP ownership and restrictions",
  "terminationPolicy": "How and when the vendor can terminate the license",
  "autoRenewal": "Auto-renewal and cancellation terms",
  "liabilityLimitation": "Liability cap and indemnification details",
  "prohibitedUses": ["List of prohibited use cases"],
  "recommendations": ["List of 3-5 procurement recommendations for the buyer"]
}

Only return valid JSON. No markdown, no explanation outside the JSON.`;

router.post(
  '/',
  (req, res, next) => {
    upload.single('eulaFile')(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res
          .status(413)
          .json({ error: 'File too large. Maximum allowed size is 10 MB.' });
      }
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please attach a PDF.' });
    }

    let extractedText;
    try {
      const { text } = await parsePdf(req.file.buffer);
      extractedText = text;
    } catch (parseErr) {
      return res
        .status(422)
        .json({ error: 'Could not read PDF. Make sure it is a valid, text-based PDF.' });
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return res.status(422).json({
        error:
          'The PDF appears to be empty or image-based (scanned). Please upload a text-based PDF.',
      });
    }

    // Truncate to ~120,000 characters to stay within token limits
    const truncatedText =
      extractedText.length > 120000
        ? extractedText.slice(0, 120000) + '\n\n[Document truncated for analysis]'
        : extractedText;

    try {
      const completion = await callGateway([
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analyze the following EULA text and return the structured JSON:\n\n${truncatedText}`,
        },
      ]);

      const rawContent = completion.choices?.[0]?.message?.content;
      if (!rawContent) {
        throw new Error('Empty response from AI model.');
      }

      let analysisResult;
      try {
        analysisResult = JSON.parse(rawContent);
      } catch {
        throw new Error('AI returned malformed JSON. Please try again.');
      }

      return res.json(analysisResult);
    } catch (apiErr) {
      console.error('OpenAI API error:', apiErr);

      if (apiErr.status === 401) {
        return res
          .status(502)
          .json({ error: 'Invalid OpenAI API key. Check your .env configuration.' });
      }
      if (apiErr.status === 429) {
        return res
          .status(429)
          .json({ error: 'API rate limit reached. Please wait a moment and try again.' });
      }

      return res.status(502).json({
        error: 'AI analysis failed. Please try again.',
        detail: apiErr.message,
      });
    }
  }
);

module.exports = router;
