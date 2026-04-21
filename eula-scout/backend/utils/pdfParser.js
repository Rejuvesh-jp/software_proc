const pdfParse = require('pdf-parse');

/**
 * Extracts plain text from a PDF buffer.
 * @param {Buffer} buffer - The PDF file buffer
 * @returns {{ text: string, numPages: number }}
 */
async function parsePdf(buffer) {
  try {
    const data = await pdfParse(buffer);
    return {
      text: data.text || '',
      numPages: data.numpages || 0,
    };
  } catch (err) {
    throw new Error(`Failed to parse PDF: ${err.message}`);
  }
}

module.exports = { parsePdf };
