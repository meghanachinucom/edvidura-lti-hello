import * as pdfjs from 'pdfjs-dist';
// Vite resolves the worker URL for the browser bundle.
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export type ExtractedChapter = {
  title: string;
  body: string;
  pageCount: number;
  sourceName: string;
};

function cleanText(raw: string): string {
  return raw
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function guessTitle(text: string, fileName: string): string {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines.slice(0, 12)) {
    if (line.length < 8 || line.length > 90) continue;
    if (/^page\s+\d+/i.test(line)) continue;
    if (/^\d+$/.test(line)) continue;
    return line;
  }
  return fileName.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim() || 'Uploaded chapter';
}

/** Extract plain text from a chapter PDF (text PDFs; scanned images need OCR later). */
export async function extractChapterFromPdf(file: File): Promise<ExtractedChapter> {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const chunks: string[] = [];
  const maxPages = Math.min(doc.numPages, 40);

  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? String(item.str) : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (pageText) chunks.push(pageText);
  }

  const body = cleanText(chunks.join('\n\n'));
  if (!body) {
    throw new Error(
      'No readable text in this PDF. Use a text PDF (not a scanned image), or paste the chapter.'
    );
  }

  return {
    title: guessTitle(body, file.name).slice(0, 120),
    body: body.slice(0, 12000),
    pageCount: doc.numPages,
    sourceName: file.name,
  };
}
