import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import type { ApiKey, DownloadRequest, RecentRequest } from '../types';

class StorageService {
  private keys: Map<string, ApiKey> = new Map();
  private requests: DownloadRequest[] = [];
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    
    // Ensure data directory exists
    try {
      await fs.mkdir(config.dataDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create data directory:', error);
    }

    // Load existing keys
    await this.loadKeys();
    
    // Load existing requests
    await this.loadRequests();
    
    this.initialized = true;
  }

  private async loadKeys(): Promise<void> {
    try {
      const data = await fs.readFile(config.keysFilePath, 'utf-8');
      const keys: ApiKey[] = JSON.parse(data);
      this.keys = new Map(keys.map(k => [k.id, k]));
    } catch (error) {
      // File doesn't exist yet, that's okay
      this.keys = new Map();
    }
  }

  private async saveKeys(): Promise<void> {
    const keys = Array.from(this.keys.values());
    await fs.writeFile(config.keysFilePath, JSON.stringify(keys, null, 2));
  }

  private async loadRequests(): Promise<void> {
    try {
      const data = await fs.readFile(config.requestsFilePath, 'utf-8');
      this.requests = JSON.parse(data);
    } catch (error) {
      this.requests = [];
    }
  }

  private async saveRequests(): Promise<void> {
    // Keep only last 100 requests
    const requestsToSave = this.requests.slice(-config.maxRecentRequests);
    await fs.writeFile(config.requestsFilePath, JSON.stringify(requestsToSave, null, 2));
  }

  // API Key methods
  async getAllKeys(): Promise<ApiKey[]> {
    return Array.from(this.keys.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getKeyById(id: string): Promise<ApiKey | undefined> {
    return this.keys.get(id);
  }

  async getKeyByKey(key: string): Promise<ApiKey | undefined> {
    return Array.from(this.keys.values()).find(k => k.key === key);
  }

  async createKey(key: ApiKey): Promise<ApiKey> {
    this.keys.set(key.id, key);
    await this.saveKeys();
    return key;
  }

  async deleteKey(id: string): Promise<boolean> {
    const deleted = this.keys.delete(id);
    if (deleted) {
      await this.saveKeys();
    }
    return deleted;
  }

  async updateKeyLastUsed(id: string): Promise<void> {
    const key = this.keys.get(id);
    if (key) {
      key.lastUsedAt = new Date().toISOString();
      key.totalRequests++;
      await this.saveKeys();
    }
  }

  // Request methods
  async addRequest(request: DownloadRequest): Promise<void> {
    this.requests.push(request);
    await this.saveRequests();
  }

  async updateRequest(request: Partial<DownloadRequest> & { id: string }): Promise<void> {
    const index = this.requests.findIndex(r => r.id === request.id);
    if (index !== -1) {
      this.requests[index] = { ...this.requests[index], ...request };
      await this.saveRequests();
    }
  }

  async getRequestById(id: string): Promise<DownloadRequest | undefined> {
    return this.requests.find(r => r.id === id);
  }

  async getRecentRequests(limit: number = 10): Promise<RecentRequest[]> {
    const keys = await this.getAllKeys();
    const keyMap = new Map(keys.map(k => [k.id, k]));
    
    return this.requests
      .slice(-limit)
      .reverse()
      .map(r => ({
        id: r.id,
        url: r.url,
        status: r.status,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
        apiKeyName: keyMap.get(r.apiKeyId)?.name || 'Unknown',
      }));
  }

  async getRequestCount(): Promise<number> {
    return this.requests.length;
  }

  async getStats(): Promise<{ totalRequests: number; totalKeys: number }> {
    return {
      totalRequests: this.requests.length,
      totalKeys: this.keys.size,
    };
  }
}

export const storage = new StorageService();
