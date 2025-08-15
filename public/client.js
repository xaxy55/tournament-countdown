const remainingEl = document.getElementById('remaining');
const statusEl = document.getElementById('status');
const durationInput = document.getElementById('duration');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

const socket = io();
const flashEl = document.getElementById('flash');

function triggerFlash() {
  if (!flashEl) return;
  // Restart animation by toggling class
  flashEl.classList.remove('show');
  // Force reflow to reset animation state
  void flashEl.offsetWidth;
  flashEl.classList.add('show');
}

function formatMs(ms) {
  const clamped = Math.max(0, ms|0);
  const totalTenths = Math.floor(clamped / 100);
  const tenths = totalTenths % 10;
  const totalSeconds = Math.floor(clamped / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${mm}:${ss}.${tenths}`;
}

function setState(state) {
  remainingEl.textContent = formatMs(state.remainingMs ?? 0);
  if (state.running) {
    statusEl.textContent = 'Running';
    statusEl.className = 'status running';
  } else if ((state.remainingMs ?? 0) === 0 && state.endTime) {
    statusEl.textContent = 'Done';
    statusEl.className = 'status done';
  triggerFlash();
  } else {
    statusEl.textContent = 'Idle';
    statusEl.className = 'status idle';
  }
}

startBtn.addEventListener('click', async () => {
  const seconds = Math.max(0, Math.floor(Number(durationInput.value || 0)));
  const res = await fetch('/api/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ durationMs: seconds * 1000 })
  });
  const data = await res.json();
  // state will also arrive via socket 'start' and 'tick'
  setState(data.state);
});

resetBtn.addEventListener('click', async () => {
  const res = await fetch('/api/reset', { method: 'POST' });
  const data = await res.json();
  setState(data.state);
});

socket.on('state', (state) => setState(state));
socket.on('start', (state) => setState(state));
socket.on('tick', (state) => setState(state));
socket.on('reset', (state) => setState(state));
socket.on('done', () => {
  statusEl.textContent = 'Done';
  statusEl.className = 'status done';
  triggerFlash();
});
