import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*'
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Shared countdown state
let countdown = {
  durationMs: 45000, // default 45s
  endTime: null, // timestamp in ms when countdown ends, or null
  running: false
};
let intervalHandle = null;

function getState() {
  const now = Date.now();
  const remainingMs = countdown.running && countdown.endTime ? Math.max(0, countdown.endTime - now) : 0;
  const running = countdown.running && remainingMs > 0;
  return {
    durationMs: countdown.durationMs,
    endTime: countdown.endTime,
    remainingMs,
    running
  };
}

function stopTicker() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

function startTicker() {
  stopTicker();
  intervalHandle = setInterval(() => {
    const state = getState();
    io.emit('tick', state);
    if (!state.running) {
      countdown.running = false;
      stopTicker();
      io.emit('done');
    }
  }, 200); // 5 FPS updates
}

// API endpoints
app.post('/api/start', (req, res) => {
  const { durationMs } = req.body || {};
  const d = Number.isFinite(durationMs) ? Math.max(0, Math.floor(durationMs)) : countdown.durationMs;
  countdown.durationMs = d;
  countdown.endTime = Date.now() + d;
  countdown.running = d > 0;
  const state = getState();
  io.emit('start', state);
  startTicker();
  res.json({ ok: true, state });
});

app.post('/api/reset', (_req, res) => {
  countdown.endTime = null;
  countdown.running = false;
  stopTicker();
  const state = getState();
  io.emit('reset', state);
  res.json({ ok: true, state });
});

app.get('/api/state', (_req, res) => {
  res.json(getState());
});

io.on('connection', (socket) => {
  // Send current state to new client
  socket.emit('state', getState());

  // Allow clients to start/reset via sockets too
  socket.on('start', ({ durationMs } = {}) => {
    const d = Number.isFinite(durationMs) ? Math.max(0, Math.floor(durationMs)) : countdown.durationMs;
    countdown.durationMs = d;
    countdown.endTime = Date.now() + d;
    countdown.running = d > 0;
    const state = getState();
    io.emit('start', state);
    startTicker();
  });

  socket.on('reset', () => {
    countdown.endTime = null;
    countdown.running = false;
    stopTicker();
    const state = getState();
    io.emit('reset', state);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Counter web listening on http://localhost:${PORT}`);
});
