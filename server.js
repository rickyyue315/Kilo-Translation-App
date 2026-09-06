/**
 * Kilo Voice Translator - Universal backend server (Zeabur / Docker / local).
 *
 * Serves the Vite build output (dist/) and exposes the same API routes that
 * were previously Netlify Functions:
 *   POST /api/translate  (also /.netlify/functions/translate for compat)
 *   POST /api/transcribe (also /.netlify/functions/transcribe for compat)
 *   GET  /api/health
 *
 * Env vars:
 *   OPENROUTER_API_KEY - OpenRouter key (chat + ASR proxy)
 *   PORT               - listen port (Zeabur injects this automatically)
 *   CORS_ORIGIN        - allowed origin, default "*"
 */

import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import multer from 'multer';

import {
  handleHealth,
  handleTranslate,
  handleTranscribe,
  translateHandler,
} from './api/_shared.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
});

const translateCompat = (req, res) =>
  translateHandler(
    {
      httpMethod: req.method,
      headers: req.headers,
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}),
      isBase64Encoded: false,
    },
    res
  );

app.get('/api/health', handleHealth);
app.post('/api/translate', translateCompat);
app.post('/.netlify/functions/translate', translateCompat);
app.post('/api/transcribe', upload.single('file'), handleTranscribe);
app.post('/.netlify/functions/transcribe', upload.single('file'), handleTranscribe);

const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir, { maxAge: '1d', index: false }));
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/.netlify/')) return next();
  res.sendFile(path.join(distDir, 'index.html'), (err) => {
    if (err) res.status(404).send('Not found — run `npm run build` first.');
  });
});

app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kilo Voice Translator listening on :${PORT}`);
  });
}

export { app, handleTranslate, handleTranscribe };
export default app;
