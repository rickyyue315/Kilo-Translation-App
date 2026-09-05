// Netlify Function: ASR proxy → OpenRouter /audio/transcriptions.
// Thin wrapper; all logic lives in ../../api/_shared.js so Zeabur (server.js)
// and Netlify share one implementation.
import { handleTranscribe } from '../../api/_shared.js';
import busboy from 'busboy';

function toExpressLike(event) {
  return new Promise((resolve, reject) => {
    const headers = event.headers || {};
    const contentType = headers['content-type'] || headers['Content-Type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      resolve({
        method: event.httpMethod,
        headers,
        ip: headers['x-forwarded-for'] || headers['client-ip'],
        body: {},
        file: null,
      });
      return;
    }
    const bb = busboy({ headers });
    let fileBuffer = null;
    let mimeType = null;
    const fields = {};
    bb.on('file', (_field, file, info) => {
      const chunks = [];
      file.on('data', (d) => chunks.push(d));
      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
        mimeType = info.mimeType;
      });
    });
    bb.on('field', (name, val) => { fields[name] = val; });
    bb.on('close', () => {
      resolve({
        method: event.httpMethod,
        headers,
        ip: headers['x-forwarded-for'] || headers['client-ip'],
        body: fields,
        file: fileBuffer ? { buffer: fileBuffer, mimetype: mimeType } : null,
      });
    });
    bb.on('error', reject);
    bb.write(event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body);
    bb.end();
  });
}

export const handler = async (event) => {
  const req = await toExpressLike(event);
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      headers: {},
      status(code) { this.statusCode = code; return this; },
      set(h) { Object.assign(this.headers, h); return this; },
      json(payload) {
        resolve({ statusCode: this.statusCode, headers: { ...this.headers, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      },
      send(body) {
        resolve({ statusCode: this.statusCode, headers: this.headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
      },
    };
    handleTranscribe(req, res).catch((error) => {
      resolve({ statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.message }) });
    });
  });
};
