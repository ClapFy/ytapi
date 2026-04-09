import { config } from '../config';
import { storage } from './storage';

export async function validateApiKey(key: string): Promise<{ valid: boolean; keyId?: string }> {
  if (!key) return { valid: false };
  
  const apiKey = await storage.getKeyByKey(key);
  if (!apiKey) return { valid: false };
  
  // Update last used
  await storage.updateKeyLastUsed(apiKey.id);
  
  return { valid: true, keyId: apiKey.id };
}

export function validateAdminPassword(password: string): boolean {
  return password === config.adminPassword;
}
