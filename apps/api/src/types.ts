export interface ApiKey {
  id: string;
  key: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
  totalRequests: number;
}

export interface DownloadRequest {
  id: string;
  url: string;
  apiKeyId: string;
  status: 'pending' | 'downloading' | 'processing' | 'completed' | 'failed';
  progress: number;
  speed?: string;
  eta?: string;
  filename?: string;
  title?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  /** Absolute path to finished file on disk (background downloads). */
  artifactPath?: string;
}

export interface DownloadProgress {
  downloadId: string;
  status: DownloadRequest['status'];
  progress: number;
  speed?: string;
  eta?: string;
  filename?: string;
  title?: string;
  error?: string;
}

export interface WebhookPayload {
  event: 'download.started' | 'download.progress' | 'download.completed' | 'download.failed';
  downloadId: string;
  data: {
    url: string;
    status: DownloadRequest['status'];
    progress: number;
    speed?: string;
    eta?: string;
    filename?: string;
    title?: string;
    error?: string;
  };
  timestamp: string;
  signature: string;
}

export interface RecentRequest {
  id: string;
  url: string;
  status: DownloadRequest['status'];
  createdAt: string;
  completedAt?: string;
  apiKeyName: string;
}
