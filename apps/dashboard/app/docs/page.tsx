'use client';

import { useState, useEffect } from 'react';
import { 
  Copy, 
  Check, 
  LogOut, 
  BookOpen,
  Download,
  Terminal,
  ChevronLeft,
  Code,
  Globe
} from 'lucide-react';

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

const documentationSections: Section[] = [
  {
    id: 'overview',
    title: 'OVERVIEW',
    content: (
      <div className="space-y-4">
        <p className="font-mono text-fg">
          YTAPI is a high-performance YouTube video download API built on yt-dlp.
          It provides simple, fast access to video downloads with maximum quality 
          h.264 encoding and Safari user-agent emulation.
        </p>
        <div className="terminal-border bg-card/30 p-4">
          <h3 className="sys-label mb-2">FEATURES</h3>
          <ul className="font-mono text-sm space-y-1 text-fg/80">
            <li><span className="text-success">[+]</span> Maximum quality h.264 downloads</li>
            <li><span className="text-success">[+]</span> Audio + Video merged via ffmpeg</li>
            <li><span className="text-success">[+]</span> Safari user-agent emulation</li>
            <li><span className="text-success">[+]</span> Live progress via WebSocket</li>
            <li><span className="text-success">[+]</span> Webhook notifications with HMAC</li>
            <li><span className="text-success">[+]</span> Supports 1000+ sites via yt-dlp</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'authentication',
    title: 'AUTHENTICATION',
    content: (
      <div className="space-y-4">
        <p className="font-mono text-fg">
          All API endpoints require an API key passed in the <code className="text-info">X-API-Key</code> header.
          Generate keys from the dashboard.
        </p>
        <div className="terminal-border bg-bg p-4">
          <div className="sys-label mb-2">HEADER FORMAT</div>
          <code className="font-mono text-sm text-fg">
            X-API-Key: yt_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
          </code>
        </div>
      </div>
    ),
  },
  {
    id: 'download-endpoint',
    title: 'POST /api/download',
    content: (
      <div className="space-y-4">
        <p className="font-mono text-fg">
          Start a new download. Returns immediately and streams the video directly.
        </p>
        
        <div className="space-y-2">
          <h4 className="sys-label">REQUEST BODY</h4>
          <div className="terminal-border bg-bg p-4">
            <pre className="font-mono text-sm text-fg overflow-x-auto">
{`{
  "url": "https://youtube.com/watch?v=...",
  "webhook_url": "https://your-site.com/webhook",
  "webhook_secret": "your-secret-key"
}`}
            </pre>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="sys-label">RESPONSE</h4>
          <div className="terminal-border bg-bg p-4">
            <pre className="font-mono text-sm text-fg overflow-x-auto">
{`{
  "success": true,
  "downloadId": "uuid-string",
  "status": "downloading",
  "message": "Download started"
}`}
            </pre>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'direct-download',
    title: 'POST /api/download/direct',
    content: (
      <div className="space-y-4">
        <p className="font-mono text-fg">
          Direct streaming download. The video is streamed directly to the client
          as the response body. No storage - the video is deleted after streaming.
        </p>
        
        <div className="space-y-2">
          <h4 className="sys-label">EXAMPLE WITH CURL</h4>
          <div className="terminal-border bg-bg p-4">
            <pre className="font-mono text-sm text-fg overflow-x-auto">
{`curl -X POST \\
  https://your-api.com/api/download/direct \\
  -H "X-API-Key: yt_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://youtube.com/watch?v=..."}' \\
  --output video.mp4`}
            </pre>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="sys-label">EXAMPLE WITH JAVASCRIPT</h4>
          <div className="terminal-border bg-bg p-4">
            <pre className="font-mono text-sm text-fg overflow-x-auto">
{`const response = await fetch('/api/download/direct', {
  method: 'POST',
  headers: {
    'X-API-Key': 'yt_your_key_here',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://youtube.com/watch?v=...',
    webhook_url: 'https://your-site.com/webhook',
    webhook_secret: 'your-secret'
  })
});

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'video.mp4';
a.click();`}
            </pre>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'status-endpoint',
    title: 'GET /api/download/:id/status',
    content: (
      <div className="space-y-4">
        <p className="font-mono text-fg">
          Check the status of a download.
        </p>
        
        <div className="space-y-2">
          <h4 className="sys-label">RESPONSE</h4>
          <div className="terminal-border bg-bg p-4">
            <pre className="font-mono text-sm text-fg overflow-x-auto">
{`{
  "downloadId": "uuid-string",
  "status": "downloading",
  "progress": 45.5,
  "speed": "5.2 MB/s",
  "eta": "01:30",
  "filename": "video_title.mp4",
  "title": "Video Title",
  "error": null
}`}
            </pre>
          </div>
        </div>

        <div className="terminal-border bg-card/30 p-4">
          <h4 className="sys-label mb-2">STATUS VALUES</h4>
          <ul className="font-mono text-sm space-y-1">
            <li><span className="text-warning">[pending]</span> - Queued for download</li>
            <li><span className="text-info">[downloading]</span> - Download in progress</li>
            <li><span className="text-success">[completed]</span> - Download finished</li>
            <li><span className="text-error">[failed]</span> - Download failed</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'websocket',
    title: 'WEBSOCKET /ws/start',
    content: (
      <div className="space-y-4">
        <p className="font-mono text-fg">
          Connect via WebSocket for real-time download progress and to receive the video data.
        </p>
        
        <div className="space-y-2">
          <h4 className="sys-label">CONNECTION URL</h4>
          <div className="terminal-border bg-bg p-4">
            <code className="font-mono text-sm text-fg">
              wss://your-api.com/ws/start?apiKey=yt_your_key&url=video_url
            </code>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="sys-label">MESSAGE TYPES</h4>
          <div className="terminal-border bg-bg p-4">
            <pre className="font-mono text-sm text-fg overflow-x-auto">
{`// Started
{
  "type": "started",
  "downloadId": "uuid",
  "data": { "url": "...", "title": "...", "status": "downloading" }
}

// Progress
{
  "type": "progress",
  "downloadId": "uuid",
  "data": { "progress": 45.5, "speed": "5.2 MB/s", "eta": "01:30" }
}

// Data chunk (base64 encoded)
{
  "type": "data",
  "downloadId": "uuid",
  "data": "base64-encoded-binary-data"
}

// Completed
{
  "type": "completed",
  "downloadId": "uuid",
  "data": { "status": "completed", "filename": "..." }
}

// Error
{
  "type": "error",
  "downloadId": "uuid",
  "data": { "error": "Error message", "status": "failed" }
}`}
            </pre>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'webhooks',
    title: 'WEBHOOKS',
    content: (
      <div className="space-y-4">
        <p className="font-mono text-fg">
          Configure webhooks to receive HTTP callbacks when download events occur.
          Webhooks include HMAC-SHA256 signatures when a secret is provided.
        </p>
        
        <div className="space-y-2">
          <h4 className="sys-label">EVENTS</h4>
          <div className="terminal-border bg-card/30 p-4">
            <ul className="font-mono text-sm space-y-1">
              <li><span className="text-info">download.started</span> - Download initiated</li>
              <li><span className="text-info">download.progress</span> - Progress update (every 10%)</li>
              <li><span className="text-success">download.completed</span> - Download finished</li>
              <li><span className="text-error">download.failed</span> - Download failed</li>
            </ul>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="sys-label">WEBHOOK PAYLOAD</h4>
          <div className="terminal-border bg-bg p-4">
            <pre className="font-mono text-sm text-fg overflow-x-auto">
{`{
  "event": "download.completed",
  "downloadId": "uuid-string",
  "data": {
    "url": "https://youtube.com/watch?v=...",
    "status": "completed",
    "progress": 100,
    "filename": "video.mp4",
    "title": "Video Title"
  },
  "timestamp": "2024-01-01T00:00:00Z",
  "signature": "sha256=xxxxxxxx..."
}`}
            </pre>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="sys-label">SIGNATURE VERIFICATION</h4>
          <div className="terminal-border bg-bg p-4">
            <pre className="font-mono text-sm text-fg overflow-x-auto">
{`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}
            </pre>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'errors',
    title: 'ERROR CODES',
    content: (
      <div className="space-y-4">
        <div className="terminal-border bg-card/30 p-4">
          <table className="w-full font-mono text-sm">
            <thead>
              <tr className="border-b border-border text-left sys-label">
                <th className="pb-2">CODE</th>
                <th className="pb-2">STATUS</th>
                <th className="pb-2">DESCRIPTION</th>
              </tr>
            </thead>
            <tbody className="text-fg/80">
              <tr className="border-b border-border/50">
                <td className="py-2 text-error">MISSING_API_KEY</td>
                <td className="py-2">401</td>
                <td className="py-2">No API key provided</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-error">INVALID_API_KEY</td>
                <td className="py-2">401</td>
                <td className="py-2">API key is invalid or revoked</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-error">MISSING_URL</td>
                <td className="py-2">400</td>
                <td className="py-2">No URL provided</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-error">INVALID_URL</td>
                <td className="py-2">400</td>
                <td className="py-2">URL format is invalid</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-error">NOT_FOUND</td>
                <td className="py-2">404</td>
                <td className="py-2">Download not found</td>
              </tr>
              <tr>
                <td className="py-2 text-error">DOWNLOAD_FAILED</td>
                <td className="py-2">500</td>
                <td className="py-2">Video download failed</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    ),
  },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview');
  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toISOString().replace('T', ' ').slice(0, 19);
  };

  const handleLogout = () => {
    localStorage.removeItem('ytapi_admin_password');
    window.location.href = '/';
  };

  const downloadDocs = () => {
    const docsContent = `# YTAPI Documentation

## Overview
YTAPI is a high-performance YouTube video download API built on yt-dlp.

## Base URL
\`https://your-api.com\`

## Authentication
All requests require an \`X-API-Key\` header.

## Endpoints

### POST /api/download
Start a new download.

**Headers:**
- X-API-Key: your-api-key
- Content-Type: application/json

**Body:**
\`\`\`json
{
  "url": "https://youtube.com/watch?v=...",
  "webhook_url": "https://your-site.com/webhook",
  "webhook_secret": "your-secret"
}
\`\`\`

### POST /api/download/direct
Direct streaming download.

### GET /api/download/:id/status
Check download status.

### WebSocket /ws/start
Real-time progress and streaming.

## Webhooks
Webhooks are sent for events: download.started, download.progress, download.completed, download.failed

Include webhook_secret for HMAC signature verification.

## Error Codes
- MISSING_API_KEY (401)
- INVALID_API_KEY (401)
- MISSING_URL (400)
- INVALID_URL (400)
- NOT_FOUND (404)
- DOWNLOAD_FAILED (500)
`;

    const blob = new Blob([docsContent], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'YTAPI_DOCUMENTATION.md';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const activeContent = documentationSections.find(s => s.id === activeSection)?.content;

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border bg-card/30">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="flex h-8 w-8 items-center justify-center border border-fg bg-fg text-bg font-bold text-lg hover:bg-fg/90">
              Y
            </a>
            <span className="font-mono text-xl tracking-wider text-fg">
              YTAPI // DOCS
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={downloadDocs}
              className="terminal-btn hidden sm:flex"
            >
              <Download className="h-4 w-4 mr-2" />
              DOWNLOAD
            </button>
            <a
              href="/dashboard"
              className="terminal-btn"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              BACK
            </a>
            <button
              onClick={handleLogout}
              className="terminal-btn danger"
            >
              <LogOut className="h-4 w-4 mr-2" />
              EXIT
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex min-h-[calc(100vh-4rem-2rem)]">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-card/20 hidden lg:block">
          <div className="p-4">
            <div className="sys-label mb-4">SECTIONS</div>
            <nav className="space-y-1">
              {documentationSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-3 py-2 font-mono text-sm transition-colors ${
                    activeSection === section.id
                      ? 'bg-fg text-bg'
                      : 'text-fg/70 hover:bg-fg/10'
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          {/* Mobile nav */}
          <div className="lg:hidden mb-6">
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value)}
              className="terminal-input w-full"
            >
              {documentationSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
          </div>

          <div className="max-w-4xl">
            <div className="mb-6 flex items-center gap-2 border-b border-border pb-4">
              <BookOpen className="h-5 w-5 text-info" />
              <h1 className="font-mono text-2xl text-fg">
                {documentationSections.find(s => s.id === activeSection)?.title}
              </h1>
            </div>

            <div className="space-y-6">
              {activeContent}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-bg px-4 py-2">
        <div className="flex justify-between text-xs sys-label">
          <span>YTAPI DOCUMENTATION v1.0.0</span>
          <span className="flex items-center gap-2">
            <span className="text-success">●</span>
            CONNECTED
          </span>
        </div>
      </footer>
    </div>
  );
}
