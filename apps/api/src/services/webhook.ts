import crypto from 'crypto';
import type { DownloadRequest, WebhookPayload } from '../types';
import { config } from '../config';

export function generateWebhookSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function sendWebhook(
  url: string,
  event: WebhookPayload['event'],
  request: DownloadRequest,
  secret?: string
): Promise<boolean> {
  try {
    const payload: Omit<WebhookPayload, 'signature'> & { signature?: string } = {
      event,
      downloadId: request.id,
      data: {
        url: request.url,
        status: request.status,
        progress: request.progress,
        speed: request.speed,
        eta: request.eta,
        filename: request.filename,
        title: request.title,
        error: request.error,
      },
      timestamp: new Date().toISOString(),
    };

    // Generate signature if secret is provided
    if (secret) {
      const payloadString = JSON.stringify(payload);
      payload.signature = generateWebhookSignature(payloadString, secret);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.webhookTimeout);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': event,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return response.ok;
  } catch (error) {
    console.error('Webhook delivery failed:', error);
    return false;
  }
}
