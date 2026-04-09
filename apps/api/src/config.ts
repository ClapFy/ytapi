import path from 'path';

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  dataDir: process.env.DATA_DIR || '/data',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // yt-dlp settings
  ytdlpPath: process.env.YTDLP_PATH || 'yt-dlp',
  
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
};

if (!config.adminPassword && config.nodeEnv === 'production') {
  console.error('ERROR: ADMIN_PASSWORD environment variable is required');
  process.exit(1);
}
