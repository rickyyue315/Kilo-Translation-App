// Netlify Function: health probe.
// Mirrors /api/health on Zeabur so the frontend can read the server-key model
// policy (paidModelsEnabled) on both hosts. Thin wrapper over api/_shared.js.

import { handleHealth } from '../../api/_shared.js';

export const handler = async () => {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      headers: {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      set(headers) {
        Object.assign(this.headers, headers);
        return this;
      },
      json(payload) {
        resolve({
          statusCode: this.statusCode,
          headers: { ...this.headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
          body: JSON.stringify(payload),
        });
      },
      send(body) {
        resolve({
          statusCode: this.statusCode,
          headers: this.headers,
          body: typeof body === 'string' ? body : JSON.stringify(body),
        });
      },
    };
    handleHealth({}, res);
  });
};
