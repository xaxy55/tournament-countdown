# tournament-countdown

A tiny real-time countdown web app. Everyone sees the same timer. You can start/reset via UI or HTTP API.

## Features
- Adjustable duration (default 30s)
- Start/reset via UI or REST API
- Real-time sync to all clients (Socket.IO)

## Run locally

1. Install dependencies
2. Start the server
3. Open http://localhost:3000

### API
- `POST /api/start` body: `{ "durationMs": number }`
- `POST /api/reset`
- `GET /api/state`

## Notes
- This uses in-memory state; restarting the server clears the countdown.
- To expose publicly, put behind a reverse proxy or deploy to a host.
