import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { createRequire } from 'module';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// OpenAPI/Swagger setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let openapiSpec = null;
try {
  const raw = fs.readFileSync(path.join(__dirname, 'openapi.json'), 'utf-8');
  openapiSpec = JSON.parse(raw);
} catch (e) {
  console.warn('[OpenAPI] Spec not loaded:', e?.message || e);
}
if (openapiSpec) {
  app.get('/openapi.json', (_req, res) => res.json(openapiSpec));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
}

// Shared countdown state
let countdown = {
  durationMs: 45000, // default 45s
  endTime: null, // timestamp in ms when countdown ends, or null
  running: false
};
let intervalHandle = null;

// HTTP-based GPIO/Relay controller (communicates with Python GPIO service)
class RelayController {
  constructor(options = {}) {
    this.enabled = !!options.enabled;
    this.serviceUrl = options.serviceUrl || process.env.GPIO_SERVICE_URL || 'http://gpio-service:3001';
    this.pinNumber = options.pinNumber ?? 17; // For reference/logging
    this.activeHigh = options.activeHigh ?? false; // For reference/logging
    this.hz = Number(options.hz ?? 2); // blink frequency when done
    this.defaultDurationMs = Number(options.defaultDurationMs ?? 10000); // ms to blink after done
    this.currentOn = false;
    this.blinkTimeout = null;
  }

  async init() {
    if (!this.enabled) {
      console.log('[GPIO] GPIO disabled');
      return;
    }
    
    try {
      // Test connection to GPIO service
      const response = await fetch(`${this.serviceUrl}/health`);
      if (!response.ok) {
        throw new Error(`GPIO service health check failed: ${response.status}`);
      }
      
      const health = await response.json();
      console.log(`[GPIO] Connected to GPIO service at ${this.serviceUrl}`);
      console.log(`[GPIO] Service status:`, health);
      
      // Ensure relay starts in OFF state
      await this.setRelay(false);
      
    } catch (e) {
      console.warn('[GPIO] Failed to connect to GPIO service:', e?.message || e);
      console.warn('[GPIO] Relay control will be disabled');
      this.enabled = false;
    }
  }

  async makeRequest(endpoint, method = 'POST') {
    if (!this.enabled) {
      console.log(`[GPIO] Disabled: would ${endpoint}`);
      return { success: false, reason: 'disabled' };
    }

    try {
      const response = await fetch(`${this.serviceUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (e) {
      console.warn(`[GPIO] Request failed ${endpoint}:`, e?.message || e);
      return { success: false, error: e?.message || e };
    }
  }

  async setRelay(on) {
    const endpoint = on ? '/relay/on' : '/relay/off';
    const result = await this.makeRequest(endpoint);
    
    if (result.success) {
      this.currentOn = on;
      console.log(`[GPIO] Relay ${on ? 'ON' : 'OFF'} via ${endpoint}`);
    } else {
      console.warn(`[GPIO] Failed to set relay ${on ? 'ON' : 'OFF'}:`, result.error || result.reason);
    }
    
    return result.success;
  }

  async startBlinking(durationMs) {
    const dur = Number.isFinite(durationMs) ? Math.max(0, Math.floor(durationMs)) : this.defaultDurationMs;
    console.log(`[GPIO] Starting relay blink for ${dur}ms`);
    
    // Stop any existing blink
    this.stopBlinking();
    
    // Start the blink via GPIO service
    const result = await this.makeRequest(`/relay/blink?duration_ms=${dur}`);
    
    if (result.success) {
      console.log(`[GPIO] Blink started for ${dur}ms via GPIO service`);
      this.currentOn = true;
      
      // Set timeout to update our internal state when blink ends
      if (dur > 0) {
        this.blinkTimeout = setTimeout(() => {
          console.log(`[GPIO] Blink duration expired`);
          this.currentOn = false;
        }, dur);
      }
    } else {
      console.warn('[GPIO] Failed to start blink:', result.error || result.reason);
    }
  }

  stopBlinking() {
    if (this.blinkTimeout) {
      clearTimeout(this.blinkTimeout);
      this.blinkTimeout = null;
    }
    
    // Turn off relay via GPIO service
    this.setRelay(false);
  }

  dispose() {
    console.log('[GPIO] Disposing relay controller');
    this.stopBlinking();
    // No GPIO cleanup needed - GPIO service handles it
  }

  // Force cleanup by sending OFF command to GPIO service
  static async forceCleanup() {
    try {
      const serviceUrl = process.env.GPIO_SERVICE_URL || 'http://gpio-service:3001';
      const response = await fetch(`${serviceUrl}/relay/off`, { method: 'POST' });
      if (response.ok) {
        console.log('[GPIO] Force cleanup: relay set to OFF via GPIO service');
      } else {
        console.warn('[GPIO] Force cleanup failed:', response.status);
      }
    } catch (e) {
      console.warn('[GPIO] Force cleanup failed:', e?.message || e);
    }
  }
}

// Configure relay from environment - async function 
const gpioEnabled = /^1|true$/i.test(String(process.env.GPIO_ENABLED || ''));
async function initializeRelay() {
  const relay = new RelayController({
    enabled: gpioEnabled,
    serviceUrl: process.env.GPIO_SERVICE_URL || 'http://gpio-service:3001',
    pinNumber: Number(process.env.RELAY_PIN ?? 17), // For reference/logging
    activeHigh: !/^0|false$/i.test(String(process.env.RELAY_ACTIVE_HIGH ?? '1')), // For reference/logging
    hz: Number(process.env.BLINK_HZ ?? 2),
    defaultDurationMs: Number(process.env.BLINK_DURATION_MS ?? 10000)
  });

  await relay.init();
  return relay;
}
    
// Initialize relay controller
const relay = await initializeRelay();

// Settings persistence
const settingsDir = path.join(__dirname, 'data');
const settingsPath = path.join(settingsDir, 'settings.json');
function ensureSettingsDir() {
  try { fs.mkdirSync(settingsDir, { recursive: true }); } catch {}
}
function saveSettingsToDisk() {
  try {
    ensureSettingsDir();
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[Settings] Failed to save settings:', e?.message || e);
  }
}

// App settings (in-memory)
const parsePresetsEnv = (val) => {
  if (!val) return [30, 45, 60];
  const arr = String(val).split(',').map((x) => Number(String(x).trim())).filter((n) => Number.isFinite(n) && n >= 0);
  return arr.length ? arr : [30, 45, 60];
};

const settings = {
  defaultDurationSeconds: Number.isFinite(Number(process.env.DEFAULT_DURATION_SECONDS))
    ? Math.max(0, Math.floor(Number(process.env.DEFAULT_DURATION_SECONDS)))
    : 45,
  presets: parsePresetsEnv(process.env.PRESETS),
  gpio: {
    enabled: gpioEnabled,
    relayPin: Number(process.env.RELAY_PIN ?? 17),
    relayActiveHigh: !/^0|false$/i.test(String(process.env.RELAY_ACTIVE_HIGH ?? '1')),
    blinkHz: Number(process.env.BLINK_HZ ?? 2),
    blinkDurationMs: Number(process.env.BLINK_DURATION_MS ?? 10000)
  },
  theme: {
    enabled: false,
    colors: {}
  },
  sound: {
    enabled: true,
    endUrl: '',
    volume: 1
  }
};

// Load persisted settings if present
try {
  const raw = fs.readFileSync(path.join(__dirname, 'data', 'settings.json'), 'utf-8');
  const persisted = JSON.parse(raw);
  if (persisted && typeof persisted === 'object') {
    if (Number.isFinite(persisted.defaultDurationSeconds)) settings.defaultDurationSeconds = Math.max(0, Math.floor(persisted.defaultDurationSeconds));
    if (Array.isArray(persisted.presets)) settings.presets = persisted.presets.filter(n => Number.isFinite(n) && n >= 0).map(n => Math.floor(n));
    if (persisted.gpio && typeof persisted.gpio === 'object') settings.gpio = { ...settings.gpio, ...persisted.gpio };
    if (persisted.theme && typeof persisted.theme === 'object') settings.theme = { ...settings.theme, ...persisted.theme };
    if (persisted.sound && typeof persisted.sound === 'object') settings.sound = { ...settings.sound, ...persisted.sound };
  }
  console.log('[Settings] Loaded persisted settings');
} catch {}

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
      console.log(`[API] Countdown finished, starting relay blink`);
      // Turn on LED when countdown is done (will stay on for configured duration)
      const blinkDuration = Number(process.env.BLINK_DURATION_MS ?? relay.defaultDurationMs);
      try { relay.startBlinking(blinkDuration); } catch {}
    }
  }, 1000); // 1 FPS updates; client animates locally
}

// API endpoints
app.get('/api/sounds', (_req, res) => {
  try {
    const soundsDir = path.join(__dirname, 'public', 'sounds');
    if (!fs.existsSync(soundsDir)) return res.json({ items: [] });
    const files = fs.readdirSync(soundsDir, { withFileTypes: true })
      .filter(d => d.isFile())
      .map(d => d.name)
      .filter(name => /\.(mp3|ogg|wav|m4a)$/i.test(name))
      .map(name => ({ name, url: `/sounds/${name}` }));
    res.json({ items: files });
  } catch (e) {
    res.status(500).json({ items: [], error: 'Failed to list sounds' });
  }
});

app.get('/api/settings', (_req, res) => {
  res.json({ settings });
});

app.post('/api/settings', (req, res) => {
  const body = req.body || {};
  try {
    const next = {
      defaultDurationSeconds: Number.isFinite(body.defaultDurationSeconds)
        ? Math.max(0, Math.floor(body.defaultDurationSeconds))
        : settings.defaultDurationSeconds,
      presets: Array.isArray(body.presets)
        ? body.presets
            .map((n) => Math.max(0, Math.floor(Number(n))))
            .filter((n) => Number.isFinite(n))
        : settings.presets,
      gpio: {
        enabled: body.gpio?.enabled ?? settings.gpio.enabled,
        relayPin: Number.isFinite(body.gpio?.relayPin)
          ? Math.max(0, Math.floor(body.gpio.relayPin))
          : settings.gpio.relayPin,
        relayActiveHigh: typeof body.gpio?.relayActiveHigh === 'boolean'
          ? body.gpio.relayActiveHigh
          : settings.gpio.relayActiveHigh,
        blinkHz: Number.isFinite(body.gpio?.blinkHz)
          ? Math.max(0, Number(body.gpio.blinkHz))
          : settings.gpio.blinkHz,
        blinkDurationMs: Number.isFinite(body.gpio?.blinkDurationMs)
          ? Math.max(0, Math.floor(Number(body.gpio.blinkDurationMs)))
          : settings.gpio.blinkDurationMs
      },
      theme: {
        enabled: !!body.theme?.enabled,
        colors: typeof body.theme?.colors === 'object' && body.theme?.colors !== null ? body.theme.colors : settings.theme.colors
      },
      sound: {
        enabled: body.sound?.enabled ?? settings.sound.enabled,
        endUrl: typeof body.sound?.endUrl === 'string' ? body.sound.endUrl : settings.sound.endUrl,
        volume: Number.isFinite(body.sound?.volume) ? Math.max(0, Math.min(1, Number(body.sound.volume))) : settings.sound.volume
      }
    };

    // Update in-memory settings
    settings.defaultDurationSeconds = next.defaultDurationSeconds;
    settings.presets = next.presets;
  settings.gpio = next.gpio;
  settings.theme = next.theme;
  settings.sound = next.sound;

    // Apply changes to relay controller at runtime
    try {
      const needsReinit = relay.pinNumber !== next.gpio.relayPin || relay.activeHigh !== next.gpio.relayActiveHigh;
      relay.enabled = !!next.gpio.enabled;
      relay.hz = Number(next.gpio.blinkHz);
      relay.defaultDurationMs = Number(next.gpio.blinkDurationMs);
      if (needsReinit) {
        try { relay.dispose(); } catch {}
        relay.pinNumber = next.gpio.relayPin;
        relay.activeHigh = next.gpio.relayActiveHigh;
        if (relay.enabled) relay.init();
      }
    } catch (e) {
      console.warn('[GPIO] Applying settings failed:', e?.message || e);
    }

  // Persist to disk
  saveSettingsToDisk();
  res.json({ ok: true, settings });
  } catch (e) {
    res.status(400).json({ ok: false, error: 'Invalid settings' });
  }
});

app.post('/api/start', (req, res) => {
  const { durationMs } = req.body || {};
  const d = Number.isFinite(durationMs) ? Math.max(0, Math.floor(durationMs)) : countdown.durationMs;
  countdown.durationMs = d;
  countdown.endTime = Date.now() + d;
  countdown.running = d > 0;
  console.log(`[API] Starting countdown for ${d}ms, stopping relay`);
  try { relay.stopBlinking(); } catch {}
  const state = getState();
  io.emit('start', state);
  startTicker();
  res.json({ ok: true, state });
});

app.post('/api/reset', (req, res) => {
  const { durationMs } = req.body || {};
  // If duration is provided, update it
  if (Number.isFinite(durationMs) && durationMs >= 0) {
    countdown.durationMs = Math.max(0, Math.floor(durationMs));
  }
  countdown.endTime = null;
  countdown.running = false;
  stopTicker();
  console.log(`[API] Resetting countdown, stopping relay`);
  try { relay.stopBlinking(); } catch {}
  const state = getState();
  io.emit('reset', state);
  res.json({ ok: true, state });
});

app.get('/api/state', (_req, res) => {
  res.json(getState());
});

// Mobile control interface
app.get('/c', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'control.html'));
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
    console.log(`[SOCKET] Starting countdown for ${d}ms, stopping relay`);
    try { relay.stopBlinking(); } catch {}
    const state = getState();
    io.emit('start', state);
    startTicker();
  });

  socket.on('reset', ({ durationMs } = {}) => {
    // If duration is provided, update it
    if (Number.isFinite(durationMs) && durationMs >= 0) {
      countdown.durationMs = Math.max(0, Math.floor(durationMs));
    }
    countdown.endTime = null;
    countdown.running = false;
    stopTicker();
  try { relay.stopBlinking(); } catch {}
    const state = getState();
    io.emit('reset', state);
  });
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Counter web listening on http://localhost:${PORT}`);
  });
}

export { app, server, io };
