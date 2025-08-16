import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { app } from '../server.js';

function startServer(port = 0) {
  return new Promise((resolve, reject) => {
    try {
      const s = app.listen(port);
      s.once('listening', () => resolve(s));
    } catch (e) { reject(e); }
  });
}

function request(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method: 'GET' }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ status: res.statusCode, text: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('OpenAPI spec and Swagger UI are served', async () => {
  const s = await startServer(0);
  const port = s.address().port;

  const spec = await request(port, '/openapi.json');
  assert.equal(spec.status, 200);
  const parsed = JSON.parse(spec.text);
  assert.equal(parsed.info.title.includes('Countdown'), true);
  assert.ok(parsed.paths['/api/state']);

  const ui = await request(port, '/api-docs');
  assert.equal(ui.status, 200);
  assert.equal(ui.text.includes('SwaggerUI'), true);

  await new Promise((r) => s.close(r));
});
