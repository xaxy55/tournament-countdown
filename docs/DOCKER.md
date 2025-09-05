# Docker Deployment Guide

## Using Pre-built Container from GitHub Container Registry

The easiest way to deploy this application is using the pre-built Docker image from GitHub Container Registry.

### Quick Start

1. **Pull and run the latest image:**
   ```bash
   docker run -d -p 3000:3000 \
     -e GPIO_ENABLED=true \
     -e RELAY_PIN=17 \
     --privileged \
     --device=/dev/gpiomem:/dev/gpiomem \
     --name counter-web \
     ghcr.io/xaxy55/tournament-countdown:latest
   ```

2. **Or use Docker Compose (recommended):**
   ```bash
   # Download the production compose file
   curl -O https://raw.githubusercontent.com/xaxy55/tournament-countdown/main/docker-compose.prod.yml
   
   # Start the application
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Available Tags

- `latest` - Latest stable build from main branch
- `develop` - Latest development build
- `v1.0.0` - Specific version tags (when releases are created)

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GPIO_ENABLED` | `false` | Enable GPIO/relay control |
| `RELAY_PIN` | `17` | BCM pin number for relay |
| `RELAY_ACTIVE_HIGH` | `1` | Set to `0` for active-low relays |
| `BLINK_HZ` | `2` | Blink frequency (not used with built-in blinking LEDs) |
| `BLINK_DURATION_MS` | `10000` | How long LED stays on (milliseconds) |
| `DEFAULT_DURATION_SECONDS` | `45` | Default countdown duration |
| `PRESETS` | `30,45,60` | Comma-separated preset durations |

### GPIO Setup for Raspberry Pi

For GPIO functionality on Raspberry Pi, the container needs:

1. **Root privileges:** `--privileged` or `user: root`
2. **Device access:** `--device=/dev/gpiomem:/dev/gpiomem`
3. **Volume mounts:** Mount `/dev/gpiomem` and `/dev/mem`

### Data Persistence

To persist settings and custom sounds:

```bash
mkdir -p ./data ./sounds
docker run -d -p 3000:3000 \
  -v ./data:/app/data \
  -v ./sounds:/app/public/sounds \
  ghcr.io/xaxy55/tournament-countdown:latest
```

### Building Your Own Image

If you want to build the image yourself:

```bash
# Clone the repository
git clone https://github.com/xaxy55/tournament-countdown.git
cd tournament-countdown

# Build and run locally
docker-compose up --build
```

### Updates

To update to the latest version:

```bash
# Pull latest image
docker pull ghcr.io/xaxy55/tournament-countdown:latest

# Restart with new image
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### Troubleshooting

1. **GPIO not working?** Run the diagnostic:
   ```bash
   docker exec -it counter-web npm run gpio-test
   ```

2. **Check logs:**
   ```bash
   docker logs counter-web
   ```

3. **Access container shell:**
   ```bash
   docker exec -it counter-web sh
   ```
