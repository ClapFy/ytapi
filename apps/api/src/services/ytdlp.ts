import { spawn } from 'child_process';
import { config } from '../config';
import type { DownloadRequest, DownloadProgress } from '../types';

export interface YtdlpOptions {
  url: string;
  downloadId: string;
  webhookUrl?: string;
  webhookSecret?: string;
  onProgress?: (progress: DownloadProgress) => void;
  onComplete?: (success: boolean, filename?: string, error?: string) => void;
}

// Safari 17 user agent for emulation
const SAFARI_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

export async function getVideoInfo(url: string): Promise<{ title: string; duration?: number } | null> {
  return new Promise((resolve) => {
    const args = [
      '--dump-json',
      '--no-playlist',
      '--user-agent', SAFARI_USER_AGENT,
      '--referer', 'https://www.youtube.com/',
      url,
    ];

    const proc = spawn(config.ytdlpPath, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        console.error('yt-dlp info error:', stderr);
        resolve(null);
        return;
      }

      try {
        const info = JSON.parse(stdout);
        resolve({
          title: info.title || 'Unknown',
          duration: info.duration,
        });
      } catch (error) {
        console.error('Failed to parse yt-dlp output:', error);
        resolve(null);
      }
    });
  });
}

export function downloadVideo(options: YtdlpOptions): { process: ReturnType<typeof spawn>; cancel: () => void } {
  const { url, onProgress, onComplete } = options;

  // Format selection: best h.264 video + best audio, fallback to best
  const format = 'bestvideo[ext=mp4][vcodec~="^((he|a)vc|h26[45])"]+bestaudio[ext=m4a]/best[ext=mp4]/best';

  const args = [
    '--format', format,
    '--merge-output-format', 'mp4',
    '--user-agent', SAFARI_USER_AGENT,
    '--referer', 'https://www.youtube.com/',
    '--add-header', 'Accept-Language:en-US,en;q=0.9',
    '--no-playlist',
    '--newline',
    '--progress-template', '%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress.filename)s',
    '--output', '-', // Output to stdout
    url,
  ];

  const proc = spawn(config.ytdlpPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let filename = '';
  let currentProgress = 0;

  proc.stderr.on('data', (data) => {
    const line = data.toString();
    
    // Parse progress line
    // Format:  45.5%|5.2MiB/s|01:30|filename.mp4
    const progressMatch = line.match(/(\d+\.?\d*)%\|([^|]*)\|([^|]*)\|?(.*)/);
    if (progressMatch) {
      currentProgress = parseFloat(progressMatch[1]);
      const speed = progressMatch[2]?.trim() || undefined;
      const eta = progressMatch[3]?.trim() || undefined;
      if (progressMatch[4]) {
        filename = progressMatch[4].trim();
      }

      onProgress?.({
        downloadId: options.downloadId,
        status: 'downloading',
        progress: currentProgress,
        speed,
        eta,
        filename,
      });
    }
  });

  proc.on('close', (code) => {
    const success = code === 0;
    onComplete?.(success, filename, success ? undefined : 'Download failed');
  });

  const cancel = () => {
    proc.kill('SIGTERM');
    setTimeout(() => {
      if (!proc.killed) {
        proc.kill('SIGKILL');
      }
    }, 5000);
  };

  return { process: proc, cancel };
}

// For direct streaming downloads
export function createYtdlpStream(url: string) {
  const format = 'bestvideo[ext=mp4][vcodec~="^((he|a)vc|h26[45])"]+bestaudio[ext=m4a]/best[ext=mp4]/best';

  const args = [
    '--format', format,
    '--merge-output-format', 'mp4',
    '--user-agent', SAFARI_USER_AGENT,
    '--referer', 'https://www.youtube.com/',
    '--add-header', 'Accept-Language:en-US,en;q=0.9',
    '--no-playlist',
    '--output', '-',
    url,
  ];

  return spawn(config.ytdlpPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
