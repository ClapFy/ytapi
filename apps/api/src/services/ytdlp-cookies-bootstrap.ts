import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';

let effectiveCookiesPath = '';

/**
 * Resolve YouTube cookies: file path from YTDLP_COOKIES_FILE, or materialize from
 * YTDLP_COOKIES_B64 / YTDLP_COOKIES_NETSCAPE into DATA_DIR (for Railway secrets).
 */
export async function bootstrapYtdlpCookies(): Promise<void> {
  effectiveCookiesPath = config.ytdlpCookiesFile;
  if (effectiveCookiesPath) {
    return;
  }

  const target = path.join(config.dataDir, '.ytapi-youtube-cookies.txt');
  const b64 = process.env.YTDLP_COOKIES_B64?.trim();
  if (b64) {
    await fs.mkdir(config.dataDir, { recursive: true });
    await fs.writeFile(target, Buffer.from(b64, 'base64'));
    effectiveCookiesPath = target;
    return;
  }

  const raw = process.env.YTDLP_COOKIES_NETSCAPE?.trim();
  if (raw) {
    await fs.mkdir(config.dataDir, { recursive: true });
    await fs.writeFile(target, raw.replace(/\\n/g, '\n'), 'utf8');
    effectiveCookiesPath = target;
  }
}

export function getEffectiveYtdlpCookiesPath(): string {
  return effectiveCookiesPath;
}
