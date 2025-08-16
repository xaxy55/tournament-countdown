import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { app, server as moduleServer } from '../server.js';

function startServer(port = 0) {
  return new Promise((resolve, reject) => {
    try {
  const s = moduleServer?.listening ? moduleServer : app.listen(port);
      s.once('listening', () => resolve(s));
      // If already listening, resolve immediately
      if (s.listening) resolve(s);
    } catch (e) { reject(e); }
  });
}

function request(srv, method, path, body) {
  return new Promise((resolve, reject) => {
    const json = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
  port: srv.address().port,
      path,
      method,
      headers: json ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) } : {}
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (json) req.write(json);
    req.end();
  });
}

test('API lifecycle: state -> start -> state -> reset', async (t) => {
  process.env.NODE_ENV = 'test';
  const s = await startServer(0);
  const basePort = s.address().port;
  assert.ok(basePort > 0);

  // initial state
  let res = await request(s, 'GET', '/api/state');
  assert.equal(res.status, 200);
  assert.equal(res.body.remainingMs, 0);
  assert.equal(res.body.running, false);

  // start 1s
  res = await request(s, 'POST', '/api/start', { durationMs: 1000 });
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.state.running, true);
  assert.ok(res.body.state.endTime);

  // reset
  res = await request(s, 'POST', '/api/reset');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.state.running, false);

  await new Promise((r) => s.close(r));
});
