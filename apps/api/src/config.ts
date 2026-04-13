import path from 'path';

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  dataDir: process.env.DATA_DIR || '/data',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // yt-dlp settings
  ytdlpPath: process.env.YTDLP_PATH || 'yt-dlp',
  /** Optional Netscape cookies file (helps when YouTube returns bot challenges on datacenter IPs). */
  ytdlpCookiesFile: process.env.YTDLP_COOKIES_FILE?.trim() || '',
  /**
   * Optional --extractor-args value (e.g. youtube:player_client=...).
   * Leave unset to use yt-dlp's built-in YouTube client order (includes android_sdkless where supported).
   */
  ytdlpExtractorArgs: process.env.YTDLP_EXTRACTOR_ARGS?.trim() || '',
  
  // Webhook settings
  webhookTimeout: parseInt(process.env.WEBHOOK_TIMEOUT || '5000'),
  
  // File paths
  get keysFilePath() {
    return path.join(this.dataDir, 'keys.json');
  },
  get requestsFilePath() {
    return path.join(this.dataDir, 'requests.json');
  },
  
  // Max recent requests to keep
  maxRecentRequests: 100,

  /** Comma-separated origins for CORS; empty = reflect request Origin (any origin). */
  corsOrigins: process.env.CORS_ORIGINS?.trim() || '',
};

if (!config.adminPassword && config.nodeEnv === 'production') {
  console.error('ERROR: ADMIN_PASSWORD environment variable is required');
  process.exit(1);
}
