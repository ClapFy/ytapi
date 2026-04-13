import { spawn } from 'child_process';
import { config } from '../config';
import { getEffectiveYtdlpCookiesPath } from './ytdlp-cookies-bootstrap';
import type { DownloadRequest, DownloadProgress } from '../types';

export interface YtdlpOptions {
  url: string;
  downloadId: string;
  /** Output template or `-` for stdout. Default `-`. */
  output?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  onProgress?: (progress: DownloadProgress) => void;
  onComplete?: (success: boolean, filename?: string, error?: string) => void;
}

/** Pipe-delimited progress lines for stderr parsing (use with --newline). */
export const YTDLP_PROGRESS_TEMPLATE =
  '%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress.filename)s';

export const ytdlpProgressCliArgs = ['--newline', '--progress-template', YTDLP_PROGRESS_TEMPLATE] as const;

/** EJS + YouTube clients that usually work on servers without browser cookies (see yt-dlp wiki / Railway). */
export function ytdlpServerYouTubeArgs(): string[] {
  const args: string[] = ['--js-runtimes', 'node'];
  const cookies = getEffectiveYtdlpCookiesPath();
  if (cookies) {
    args.push('--cookies', cookies);
  }
  if (config.ytdlpExtractorArgs) {
    args.push('--extractor-args', config.ytdlpExtractorArgs);
  }
  return args;
}

/** Buffer stderr chunks into lines so progress regexes see whole lines. */
export function forEachStderrLine(
  stderr: NodeJS.ReadableStream,
  onLine: (line: string) => void
): { flush: () => void } {
  let buf = '';
  stderr.on('data', (chunk: Buffer | string) => {
    buf += typeof chunk === 'string' ? chunk : chunk.toString();
    const parts = buf.split('\n');
    buf = parts.pop() ?? '';
    for (const line of parts) {
      onLine(line);
    }
  });
  return {
    flush: () => {
      const rest = buf.trim();
      buf = '';
      if (rest) {
        onLine(rest);
      }
    },
  };
}

/** Heuristic: yt-dlp / extractor fatal messages on stderr (not ffmpeg info). */
export function looksLikeYtdlpFatalLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  const lower = t.toLowerCase();
  if (lower.startsWith('error:')) return true;
  if (lower.includes('unable to download')) return true;
  if (lower.includes('sign in to confirm')) return true;
  if (lower.includes('video unavailable')) return true;
  if (lower.includes('private video')) return true;
  if (lower.includes('this video is not available')) return true;
  return false;
}

// Safari 17 user agent for emulation
const SAFARI_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

export async function getVideoInfo(url: string): Promise<{ title: string; duration?: number } | null> {
  return new Promise((resolve) => {
    const args = [
      '--dump-json',
      '--no-playlist',
      ...ytdlpServerYouTubeArgs(),
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
  const { url, onProgress, onComplete, output = '-' } = options;

  // Format selection: best h.264 video + best audio, fallback to best
  const format = 'bestvideo[ext=mp4][vcodec~="^((he|a)vc|h26[45])"]+bestaudio[ext=m4a]/best[ext=mp4]/best';

  const args = [
    '--format', format,
    '--merge-output-format', 'mp4',
    '--user-agent', SAFARI_USER_AGENT,
    '--referer', 'https://www.youtube.com/',
    '--add-header', 'Accept-Language:en-US,en;q=0.9',
    '--no-playlist',
    ...ytdlpServerYouTubeArgs(),
    ...ytdlpProgressCliArgs,
    '--output', output,
    url,
  ];

  const proc = spawn(config.ytdlpPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let filename = '';
  let currentProgress = 0;
  let lastErrorLine: string | undefined;

  const { flush: flushStderrLines } = forEachStderrLine(proc.stderr, (line) => {
    if (looksLikeYtdlpFatalLine(line) || /^\s*ERROR:/i.test(line.trim())) {
      lastErrorLine = line.trim();
    }
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
    flushStderrLines();
    const success = code === 0;
    const err = success ? undefined : (lastErrorLine ?? `yt-dlp exited with code ${code}`);
    onComplete?.(success, filename, err);
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
    ...ytdlpServerYouTubeArgs(),
    ...ytdlpProgressCliArgs,
    '--output', '-',
    url,
  ];

  return spawn(config.ytdlpPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
