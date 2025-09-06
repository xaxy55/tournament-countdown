import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { app } from '../server.js';

function startServer(port = 0) {
  return new Promise((resolve, reject) => {
    try { const s = app.listen(port); s.once('listening', () => resolve(s)); } catch (e) { reject(e); }
  });
}

function req(port, method, path, body) {
  return new Promise((resolve, reject) => {
    const json = body ? JSON.stringify(body) : null;
    const r = http.request({ hostname: '127.0.0.1', port, path, method, headers: json ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) } : {} }, (res) => {
      let data = ''; res.on('data', c => data += c); res.on('end', () => resolve({ status: res.statusCode, text: data }));
    });
    r.on('error', reject);
    if (json) r.write(json);
    r.end();
  });
}

test('settings GET/POST', async () => {
  const s = await startServer(0);
  const port = s.address().port;
  let res = await req(port, 'GET', '/api/settings');
  assert.equal(res.status, 200);
  const before = JSON.parse(res.text);
  const next = { ...before.settings, defaultDurationSeconds: 45, presets: [10,20,30] };
  res = await req(port, 'POST', '/api/settings', next);
  assert.equal(res.status, 200);
  const after = JSON.parse(res.text);
  assert.equal(after.settings.defaultDurationSeconds, 45);
  assert.deepEqual(after.settings.presets, [10,20,30]);
  await new Promise((r) => s.close(r));
});
