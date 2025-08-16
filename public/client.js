const remainingEl = document.getElementById('remaining');
const statusEl = document.getElementById('status');
const durationInput = document.getElementById('duration');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const fsBtn = document.getElementById('fsBtn');

const socket = io();
let flashEl = document.getElementById('flash');

function triggerFlash() {
  if (!flashEl) {
    // Lazily create if missing
    flashEl = document.createElement('div');
    flashEl.id = 'flash';
    flashEl.className = 'flash-overlay';
    flashEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(flashEl);
  }
  // Restart animation by toggling class
  flashEl.classList.remove('show');
  // Force reflow to reset animation state
  void flashEl.offsetWidth;
  flashEl.classList.add('show');
  // Stop flashing after 10 seconds
  setTimeout(() => {
    flashEl.classList.remove('show');
  }, 10000);
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
  // Slide animation on last digit changes while running
  if (state.running) {
    const tickParity = Math.floor((state.remainingMs ?? 0) / 100) % 2; // toggle every 100ms
    remainingEl.classList.toggle('slide-left', tickParity === 0);
    remainingEl.classList.toggle('slide-right', tickParity === 1);
  } else {
    remainingEl.classList.remove('slide-left', 'slide-right');
  }
  if (state.running) {
    statusEl.textContent = 'Running';
    statusEl.className = 'status running';
  document.body.classList.remove('can-start');
  } else if ((state.remainingMs ?? 0) === 0 && state.endTime) {
    statusEl.textContent = 'Done';
    statusEl.className = 'status done';
  triggerFlash();
  document.body.classList.add('can-start');
  } else {
    statusEl.textContent = 'Idle';
    statusEl.className = 'status idle';
  document.body.classList.add('can-start');
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

// Fullscreen toggle
fsBtn?.addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      fsBtn.textContent = 'Exit Fullscreen';
    } else {
      await document.exitFullscreen();
      fsBtn.textContent = 'Fullscreen';
    }
  } catch (e) {
    console.error('Fullscreen toggle failed', e);
  }
});

document.addEventListener('fullscreenchange', () => {
  if (!fsBtn) return;
  fsBtn.textContent = document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen';
  document.body.classList.toggle('is-fullscreen', !!document.fullscreenElement);
});

// Click-anywhere to start when idle/done (non-running)
document.addEventListener('click', async (e) => {
  // Ignore clicks on controls, inputs, and links
  const tag = (e.target?.tagName || '').toLowerCase();
  if (['button', 'input', 'label', 'a', 'details', 'summary'].includes(tag)) return;

  // Only when allowed
  if (!document.body.classList.contains('can-start')) return;

  const seconds = Math.max(0, Math.floor(Number(durationInput.value || 0)) || 30);
  try {
    const res = await fetch('/api/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ durationMs: seconds * 1000 })
    });
    const data = await res.json();
    setState(data.state);
  } catch (err) {
    console.error('Failed to start via click-anywhere', err);
  }
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
