# GPIO Service Integration

This project now uses a Python-based GPIO service for reliable Raspberry Pi relay control.

## Architecture

```
Node.js App (port 3000) → HTTP → Python GPIO Service (port 3001) → RPi GPIO
```

## Services

### 1. GPIO Service (Python)
- **Port:** 3001
- **Technology:** Flask + RPi.GPIO
- **Purpose:** Direct GPIO control for relay
- **Features:** 
  - HTTP API for relay control
  - Automatic cleanup on shutdown
  - Health monitoring
  - Active LOW relay support

### 2. Main Web App (Node.js)
- **Port:** 3000
- **Technology:** Express + Socket.IO
- **Purpose:** Tournament countdown web interface
- **GPIO:** Communicates with GPIO service via HTTP

## API Endpoints (GPIO Service)

- `GET /health` - Service health check
- `POST /relay/on` - Turn relay ON
- `POST /relay/off` - Turn relay OFF  
- `POST /relay/blink?duration_ms=3000` - Blink for specified duration
- `GET /relay/status` - Get current relay status

## Environment Variables

### GPIO Service
- `GPIO_ENABLED=true` - Enable/disable GPIO
- `RELAY_PIN=17` - BCM pin number
- `RELAY_ACTIVE_HIGH=0` - Set to 0 for active LOW relay

### Node.js App
- `GPIO_ENABLED=true` - Enable relay control
- `GPIO_SERVICE_URL=http://gpio-service:3001` - GPIO service URL
- `BLINK_DURATION_MS=3000` - Relay blink duration

## Deployment

```bash
# Build and start both services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

## Relay Configuration

Your setup uses an **active LOW** relay:
- `GPIO HIGH` = Relay OFF (LED OFF)
- `GPIO LOW` = Relay ON (LED ON)

This is configured with `RELAY_ACTIVE_HIGH=0` in the environment.

## Troubleshooting

### GPIO Service Not Starting
1. Check GPIO permissions in compose file
2. Verify Pi GPIO hardware access
3. Review gpio-service logs

### Relay Not Responding
1. Test GPIO service directly: `curl -X POST http://localhost:3001/relay/on`
2. Check relay wiring (VCC, GND, IN pins)
3. Verify active HIGH/LOW setting

### Communication Issues
1. Check Docker network connectivity
2. Verify service URLs in environment
3. Review Node.js app logs for HTTP errors
