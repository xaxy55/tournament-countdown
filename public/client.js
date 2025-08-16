const remainingEl = document.getElementById('remaining');
const statusEl = document.getElementById('status');
const durationInput = document.getElementById('duration');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const fsBtn = document.getElementById('fsBtn');
const presetButtons = Array.from(document.querySelectorAll('.preset'));

const socket = io();
let flashEl = document.getElementById('flash');
let flashTimeoutId = null;
let lastWasDone = false;
let rafId = null;
let localEndTime = null; // ms timestamp when current countdown should end
let baseTitle = document.title || 'Shared Countdown';
let audioCtx = null;
let endAudio = null;
let endAudioVolume = 1;
let endAudioEnabled = true;
function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      // Audio unavailable; ignore
    }
  }
  return audioCtx;
}

function beep() {
  const ctx = ensureAudio();
  if (!ctx) return;
  const duration = 0.35; // seconds
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  const now = ctx.currentTime;
  // little tri-tone to be noticeable
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(440, now + duration * 0.6);
  osc.frequency.exponentialRampToValueAtTime(660, now + duration);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function stopFlash() {
  if (!flashEl) return;
  flashEl.classList.remove('show');
  if (flashTimeoutId) {
    clearTimeout(flashTimeoutId);
    flashTimeoutId = null;
  }
}

function triggerFlash() {
  if (!flashEl) {
    // Lazily create if missing
    flashEl = document.createElement('div');
    flashEl.id = 'flash';
    flashEl.className = 'flash-overlay';
    flashEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(flashEl);
  }
  // Ensure any previous flashing is stopped before starting a new one
  stopFlash();
  // Restart animation by toggling class
  flashEl.classList.remove('show');
  // Force reflow to reset animation state
  void flashEl.offsetWidth;
  flashEl.classList.add('show');
  // Stop flashing after 10 seconds
  flashTimeoutId = setTimeout(() => {
    flashEl.classList.remove('show');
    flashTimeoutId = null;
  }, 10000);
}

async function loadSoundSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    const snd = data.settings?.sound || {};
    endAudioEnabled = snd.enabled ?? true;
    endAudioVolume = Number.isFinite(snd.volume) ? Math.max(0, Math.min(1, snd.volume)) : 1;
    const url = snd.endUrl && String(snd.endUrl).trim();
    if (url) {
      try {
        endAudio = new Audio(url);
        endAudio.preload = 'auto';
        endAudio.volume = endAudioVolume;
      } catch {}
    } else {
      endAudio = null;
    }
  } catch {}
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

function renderFrame() {
  if (!localEndTime) return;
  const now = Date.now();
  const remainingMs = Math.max(0, localEndTime - now);
  remainingEl.textContent = formatMs(remainingMs);
  // Add/remove warning under 10s remaining
  remainingEl.classList.toggle('warning', remainingMs <= 10000 && remainingMs > 0);
  // Update document title while running
  document.title = `${formatMs(remainingMs)} – ${baseTitle}`;
  if (remainingMs > 0) {
    rafId = requestAnimationFrame(renderFrame);
  }
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
  const isDone = !state.running && (state.remainingMs ?? 0) === 0 && !!state.endTime;
  if (state.running) {
    statusEl.textContent = 'Running';
    statusEl.className = 'status running';
    // Start or refresh RAF loop based on authoritative endTime
    if (state.endTime) {
      localEndTime = state.endTime;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(renderFrame);
    }
  } else if (isDone) {
    statusEl.textContent = 'Done';
    statusEl.className = 'status done';
    localEndTime = null;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  remainingEl.classList.remove('warning');
  document.title = baseTitle;
  } else {
    statusEl.textContent = 'Idle';
    statusEl.className = 'status idle';
    localEndTime = null;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  remainingEl.classList.remove('warning');
  document.title = baseTitle;
  }

  // Only start flashing when transitioning into Done; stop otherwise
  if (isDone && !lastWasDone) {
    triggerFlash();
    if (endAudioEnabled && endAudio) {
      try {
        endAudio.currentTime = 0;
        endAudio.volume = endAudioVolume;
        endAudio.play().catch(() => beep());
      } catch { beep(); }
    } else {
      beep();
    }
    if (navigator?.vibrate) {
      try { navigator.vibrate([150, 50, 150]); } catch {}
    }
  } else if (!isDone && lastWasDone) {
    stopFlash();
    try { endAudio?.pause?.(); } catch {}
  } else if (state.running) {
    // Safety: ensure no flashing while running
    stopFlash();
    try { endAudio?.pause?.(); } catch {}
  }
  lastWasDone = isDone;

  // Allow click-anywhere start when not running
  document.body.classList.toggle('can-start', !state.running);
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
  stopFlash();
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

// Preset buttons
presetButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const seconds = Number(btn.getAttribute('data-preset')) || 0;
    durationInput.value = String(seconds);
  });
});

// Keyboard shortcuts
document.addEventListener('keydown', async (e) => {
  const tag = (e.target?.tagName || '').toLowerCase();
  if (['input', 'textarea'].includes(tag)) return; // don't steal typing
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault();
    if (document.body.classList.contains('can-start')) {
      startBtn.click();
    } else {
      resetBtn.click();
    }
  } else if (e.key.toLowerCase() === 'r') {
    resetBtn.click();
  } else if (e.key.toLowerCase() === 'f') {
    fsBtn?.click();
  } else if (e.key === 'Escape') {
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch {}
    }
  }
});

socket.on('state', (state) => setState(state));
socket.on('start', (state) => setState(state));
socket.on('tick', (state) => setState(state));
socket.on('reset', (state) => {
  stopFlash();
  try { endAudio?.pause?.(); } catch {}
  setState(state);
});
socket.on('done', () => {
  statusEl.textContent = 'Done';
  statusEl.className = 'status done';
  triggerFlash();
  if (endAudioEnabled && endAudio) {
    try { endAudio.currentTime = 0; endAudio.volume = endAudioVolume; endAudio.play().catch(() => {}); } catch {}
  }
});

// Load sound preferences at startup
loadSoundSettings();
