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
  error?: string;
  createdAt: string;
  completedAt?: string;
  webhookUrl?: string;
  webhookVerified?: boolean;
}

export interface DownloadProgress {
  downloadId: string;
  status: DownloadRequest['status'];
  progress: number;
  speed?: string;
  eta?: string;
  filename?: string;
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
    error?: string;
  };
  timestamp: string;
  signature: string;
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

export interface GenerateKeyRequest {
  name: string;
}

export interface GenerateKeyResponse {
  success: boolean;
  key: ApiKey;
  fullKey: string;
}

export interface DownloadUrlRequest {
  url: string;
  webhook_url?: string;
  webhook_secret?: string;
}

export interface DownloadUrlResponse {
  success: boolean;
  downloadId: string;
  status: DownloadRequest['status'];
  message: string;
}

export interface DownloadStatusResponse {
  downloadId: string;
  status: DownloadRequest['status'];
  progress: number;
  speed?: string;
  eta?: string;
  filename?: string;
  error?: string;
}
