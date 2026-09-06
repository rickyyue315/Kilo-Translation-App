// Netlify Function: translation proxy → OpenRouter.
// Thin wrapper; all logic lives in ../../api/_shared.js so Zeabur (server.js)
// and Netlify share one implementation.
import { translateHandler } from '../../api/_shared.js';

export const handler = async (event) => {
  const normEvent = {
    httpMethod: event.httpMethod,
    headers: event.headers || {},
    body: event.body,
    isBase64Encoded: event.isBase64Encoded,
  };
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
    translateHandler(normEvent, res).catch((error) => {
      resolve({ statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.message }) });
    });
  });
};
