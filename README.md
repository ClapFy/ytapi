# YTAPI - YouTube Download API

A high-performance YouTube video download API built with yt-dlp, featuring a retro terminal-style dashboard.

## Features

- **Maximum Quality**: Downloads videos in highest available h.264 quality
- **Audio + Video**: Automatically merges audio and video using ffmpeg
- **Safari Emulation**: Uses Safari user-agent to avoid blocks
- **Live Progress**: WebSocket support for real-time download progress
- **Webhook Notifications**: HMAC-signed webhook callbacks
- **Retro Terminal UI**: Dark terminal-style dashboard
- **1000+ Sites**: Supports all sites yt-dlp supports

## Quick Start

### Prerequisites

- Railway account
- GitHub account

### Deployment

1. Fork/clone this repository to your GitHub
2. Create a new Railway project
3. Connect your GitHub repository
4. Mount a volume at `/data`
5. Set environment variable: `ADMIN_PASSWORD=your_secure_password`
6. Deploy!

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_PASSWORD` | Yes | Password for dashboard access |
| `PORT` | No | Server port (default: 3000) |
| `DATA_DIR` | No | Data directory (default: /data) |

## API Usage

### Authentication

All requests require an `X-API-Key` header:

```bash
curl -H "X-API-Key: yt_your_key_here" ...
```

### Download Video

```bash
curl -X POST https://your-api.com/api/download/direct \
  -H "X-API-Key: yt_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=..."}' \
  --output video.mp4
```

### WebSocket Live Progress

```javascript
const ws = new WebSocket('wss://your-api.com/ws/start?apiKey=yt_key&url=video_url');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress:', data.data.progress);
};
```

### Webhooks

Configure webhooks to receive notifications:

```bash
curl -X POST https://your-api.com/api/download/direct \
  -H "X-API-Key: yt_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://youtube.com/watch?v=...",
    "webhook_url": "https://your-site.com/webhook",
    "webhook_secret": "your-secret-key"
  }'
```

Verify webhook signatures:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

## Dashboard

Access the dashboard at `/` (root path):

1. Enter your admin password
2. Generate API keys
3. View recent requests
4. Download documentation

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/download` | POST | Start download |
| `/api/download/direct` | POST | Direct streaming download |
| `/api/download/:id/status` | GET | Check download status |
| `/api/keys` | GET/POST | Manage API keys |
| `/api/keys/stats` | GET | Get system stats |
| `/ws/start` | WS | WebSocket for live progress |
| `/docs/` | GET | Documentation page |

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `MISSING_API_KEY` | 401 | No API key provided |
| `INVALID_API_KEY` | 401 | Invalid or revoked key |
| `MISSING_URL` | 400 | No URL provided |
| `INVALID_URL` | 400 | URL format invalid |
| `NOT_FOUND` | 404 | Download not found |
| `DOWNLOAD_FAILED` | 500 | Download failed |

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    Railway Container                        │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────┐ │
│  │  Dashboard   │      │  API Server  │      │  /data   │ │
│  │  (Next.js)   │      │  (Fastify)   │      │  Volume  │ │
│  └──────────────┘      └──────┬───────┘      └──────────┘ │
│                               │                             │
│                         ┌─────┴─────┐                      │
│                         │ yt-dlp +  │                      │
│                         │  ffmpeg   │                      │
│                         └───────────┘                      │
└────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **API**: Fastify (Node.js 20)
- **Dashboard**: Next.js 14 + Tailwind CSS
- **Video**: yt-dlp + ffmpeg
- **Storage**: File-based JSON
- **Deployment**: Railway (Docker)

## License

Apache-2.0
Cache bust: Thu Apr  9 21:19:25 CEST 2026
