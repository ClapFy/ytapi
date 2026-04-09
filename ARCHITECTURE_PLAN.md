# YTAPI - YouTube Download API Architecture Plan

## Overview
A production-ready YouTube downloading API built with yt-dlp, featuring a Next.js dashboard, API key management, and Railway-optimized deployment.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Railway Container                         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │   Next.js App   │    │   API Server    │    │   /data     │ │
│  │   (Dashboard)   │◄──►│   (Fastify)     │◄──►│   Volume    │ │
│  │                 │    │                 │    │             │ │
│  │  - / (login)    │    │  - /api/*       │    │  - keys.json│ │
│  │  - /dashboard   │    │  - /docs/       │    │  - logs/    │ │
│  │  - /docs/       │    │  - WebSocket    │    │  - cache/   │ │
│  └─────────────────┘    └────────┬────────┘    └─────────────┘ │
│                                  │                              │
│                                  ▼                              │
│                         ┌─────────────────┐                     │
│                         │   yt-dlp +      │                     │
│                         │   ffmpeg        │                     │
│                         └─────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend API
- **Runtime**: Node.js 20+
- **Framework**: Fastify (high performance, built-in WebSocket support)
- **Video Download**: yt-dlp (Python binary bundled)
- **Video Processing**: ffmpeg (included in Docker image)
- **Storage**: File-based JSON for keys (/data/keys.json)

### Frontend Dashboard
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Authentication**: Simple password middleware (ADMIN_PASSWORD)
- **State Management**: React hooks + SWR for data fetching

### Deployment
- **Platform**: Railway
- **Container**: Docker with multi-stage build
- **Volume**: /data mounted for persistent storage

---

## API Design

### Authentication
All API endpoints require an `X-API-Key` header.

### Endpoints

#### 1. Download Video (Simple)
```http
POST /api/download
Content-Type: application/json
X-API-Key: your-api-key

{
  "url": "https://youtube.com/watch?v=...",
  "webhook_url": "optional-webhook-for-progress"
}
```

**Response:**
```json
{
  "success": true,
  "download_id": "uuid",
  "status": "processing",
  "estimated_time": "2m 30s"
}
```

#### 2. Get Download Status
```http
GET /api/download/:id/status
X-API-Key: your-api-key
```

**Response:**
```json
{
  "download_id": "uuid",
  "status": "downloading", // pending, downloading, processing, completed, failed
  "progress": 45.5,
  "speed": "5.2 MB/s",
  "eta": "1m 20s",
  "filename": "video_title.mp4",
  "download_url": "/api/download/:id/file" // available when completed
}
```

#### 3. Download File
```http
GET /api/download/:id/file
X-API-Key: your-api-key
```

Returns the video file as a binary stream.

#### 4. Live Progress (WebSocket)
```
WS /api/ws/download/:id
```

Real-time progress updates via WebSocket connection.

---

## yt-dlp Configuration

### Quality Settings
- **Format**: `bestvideo[ext=mp4][vcodec~='^((he|a)vc|h26[45])']+bestaudio[ext=m4a]/best[ext=mp4]/best`
- **User-Agent**: Safari 17.0 macOS user agent
- **Referrer**: https://www.youtube.com/

### Post-Processing
- **Merge Output**: mp4
- **Video Codec**: h264 (if available, otherwise copy)
- **Audio Codec**: aac
- **Embed Subs**: Yes (optional)
- **Embed Thumbnail**: Yes

---

## File Structure

```
/
├── apps/
│   ├── api/                    # Fastify API server
│   │   ├── src/
│   │   │   ├── server.ts       # Entry point
│   │   │   ├── routes/
│   │   │   │   ├── download.ts # Download endpoints
│   │   │   │   ├── keys.ts     # API key management
│   │   │   │   └── docs.ts     # Documentation endpoints
│   │   │   ├── services/
│   │   │   │   ├── ytdlp.ts    # yt-dlp wrapper
│   │   │   │   ├── storage.ts  # File storage service
│   │   │   │   └── auth.ts     # API key validation
│   │   │   └── types/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── dashboard/              # Next.js dashboard
│       ├── app/
│       │   ├── page.tsx        # Login page
│       │   ├── dashboard/
│       │   │   └── page.tsx    # Main dashboard
│       │   ├── docs/
│       │   │   └── page.tsx    # API documentation
│       │   └── api/
│       ├── components/
│       ├── lib/
│       ├── package.json
│       └── next.config.js
├── packages/
│   └── shared/                 # Shared types/utilities
├── Dockerfile                  # Multi-stage build
├── railway.json                # Railway configuration
├── nixpacks.toml               # Alternative build config
└── README.md
```

---

## Dashboard Design Inspiration

The dashboard will feature:

### Login Page
- Clean, minimal design with centered card
- Single password input field
- Dark theme with subtle gradient background
- Smooth animations

### Main Dashboard
- Sidebar navigation (Keys, Downloads, Documentation, Settings)
- API Keys management table with:
  - Key name/identifier
  - Partially masked key (click to reveal)
  - Usage stats
  - Created date
  - Actions (copy, regenerate, revoke)
- "Generate New Key" button with modal
- Quick download statistics

### Documentation Page
- Clean, readable typography
- Syntax-highlighted code examples
- Copy-to-clipboard buttons
- Download button for offline reference
- Dark/light theme support

### Design Elements (Inspired by shadcn/ui)
- Rounded corners (border-radius: 0.5rem to 1rem)
- Subtle shadows and borders
- Consistent spacing system
- Dark mode by default with light option
- Monospace font for code/keys
- Color palette: Slate/Zinc grays with blue/indigo accents

---

## Environment Configuration

### Required (Set by User)
```env
ADMIN_PASSWORD=your_secure_password_here
```

### Optional (Railway defaults)
```env
PORT=3000
DATA_DIR=/data
MAX_CONCURRENT_DOWNLOADS=3
MAX_FILE_SIZE=10GB
DOWNLOAD_TIMEOUT=3600
```

---

## Railway Deployment Setup

### Prerequisites
1. Create Railway project
2. Mount volume at `/data`
3. Set `ADMIN_PASSWORD` environment variable

### Automatic Deployment
- Push to GitHub triggers Railway deploy
- Dockerfile handles yt-dlp + ffmpeg installation
- Both API and Dashboard served from single container

---

## Key Features Summary

### For API Users
✅ Simple POST with URL → get download link  
✅ Webhook support for async notifications  
✅ WebSocket for real-time progress  
✅ Highest quality h.264 downloads  
✅ All yt-dlp supported sites  

### For Admin
✅ Single password login (no username)  
✅ Easy API key generation/revocation  
✅ Download history & statistics  
✅ Persistent storage on Railway volume  
✅ Downloadable API documentation  

### Technical
✅ Docker containerized  
✅ Railway-optimized  
✅ ffmpeg included for merging  
✅ Safari user-agent emulation  
✅ Rate limiting & security  

---

## Questions for User

1. **Rate Limiting**: Should I implement rate limiting per API key? If so, what limits (e.g., 100 requests/hour)?

2. **File Storage**: Should downloaded files be stored temporarily (auto-deleted after X hours) or kept until manually deleted?

3. **Max File Size**: What's the maximum video size allowed? (affects storage and timeout settings)

4. **Concurrent Downloads**: How many simultaneous downloads per API key? (default: 3)

5. **Webhook Security**: Should webhooks include a signature for verification?

6. **Download Retention**: How long should completed downloads be available? (default: 24 hours)

---

## Implementation Timeline

1. **Phase 1** (30 min): Project setup, types, shared utilities
2. **Phase 2** (45 min): API server with yt-dlp integration
3. **Phase 3** (30 min): API key management system
4. **Phase 4** (45 min): Next.js dashboard with auth
5. **Phase 5** (30 min): Documentation page
6. **Phase 6** (30 min): WebSocket progress support
7. **Phase 7** (30 min): Dockerfile and Railway config
8. **Phase 8** (30 min): Testing and refinement
9. **Phase 9** (15 min): GitHub push

**Total Estimated Time: ~4.5 hours**

---

Ready to proceed? Confirm and I'll start implementation!