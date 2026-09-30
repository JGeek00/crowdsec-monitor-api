import nodemailer from 'nodemailer';
import type { EmailChannelConfig, NotificationChannelRef, NtfyChannelConfig } from '@/models';
import { buildNtfyUrl, splitRecipients, withChannelDefaults } from '@/utils/notification-channel';
import { log } from '@/services/log.service';

export interface ChannelResult {
  type: string;
  ok: boolean;
  detail: string | null;
}

type SenderFn = (channel: NotificationChannelRef, message: string, title: string) => Promise<string | null>;

function basicAuth(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

async function sendNtfy(channel: NotificationChannelRef, message: string, title: string): Promise<string | null> {
  const config = withChannelDefaults('ntfy', channel.config) as NtfyChannelConfig;
  if (!config.topic) return 'missing topic';
  const url = buildNtfyUrl(config.server ?? '', config.topic);
  const headers: Record<string, string> = { Title: title, 'Content-Type': 'text/plain; charset=utf-8' };
  if (config.priority) headers['Priority'] = config.priority;
  if (config.tags) headers['Tags'] = config.tags;
  if (config.accessToken) {
    headers['Authorization'] = `Bearer ${config.accessToken}`;
  } else if (config.username && config.password) {
    headers['Authorization'] = basicAuth(config.username, config.password);
  }
  try {
    const res = await fetch(url, { method: 'POST', headers, body: message });
    if (!res.ok) return `ntfy http ${String(res.status)}`;
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'ntfy send failed';
  }
}

async function sendEmail(channel: NotificationChannelRef, message: string, title: string): Promise<string | null> {
  const config = withChannelDefaults('email', channel.config) as EmailChannelConfig;
  if (!config.host || !config.from || !config.to) return 'missing host, from or recipient';
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.username && config.password ? { user: config.username, pass: config.password } : undefined,
    });
    await transporter.sendMail({
      from: config.from,
      to: splitRecipients(config.to).join(', '),
      subject: title,
      text: message,
    });
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'email send failed';
  }
}

/**
 * Channel registry: add future providers here without touching the engine.
 * Key = channel.type, value = sender implementation.
 */
const registry = new Map<string, SenderFn>([
  ['ntfy', sendNtfy],
  ['email', sendEmail],
]);

export function registerNotificationChannel(type: string, sender: SenderFn): void {
  registry.set(type, sender);
}

export function supportedNotificationChannels(): string[] {
  return [...registry.keys()];
}

export async function dispatchChannels(
  channels: NotificationChannelRef[],
  message: string,
  title: string,
): Promise<ChannelResult[]> {
  const results: ChannelResult[] = [];
  for (const channel of channels) {
    const sender = registry.get(channel.type);
    if (!sender) {
      results.push({ type: channel.type, ok: false, detail: `unsupported channel ${channel.type}` });
      continue;
    }
    try {
      const detail = await sender(channel, message, title);
      results.push({ type: channel.type, ok: detail === null, detail });
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'send failed';
      log.error(`[notifications] channel ${channel.type} threw:`, err);
      results.push({ type: channel.type, ok: false, detail });
    }
  }
  return results;
}
