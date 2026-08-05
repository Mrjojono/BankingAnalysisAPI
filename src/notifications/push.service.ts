import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  priority?: 'default' | 'normal' | 'high';
}

interface ExpoPushTicket {
  id?: string;
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly expoUrl = 'https://exp.host/--/api/v2/push/send';
  private readonly EXPO_BATCH_SIZE = 100;

  constructor(private prisma: PrismaService) {}

  async registerToken(userId: string, token: string, platform?: string) {
    return this.prisma.pushToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform },
    });
  }

  async unregisterToken(userId: string, token: string) {
    await this.prisma.pushToken.deleteMany({
      where: { userId, token },
    });
  }

  async sendToUser(
    userId: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
    },
  ) {
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId },
    });

    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      title: notification.title,
      body: notification.body,
      data: notification.data ?? {},
      sound: 'default',
      priority: 'high',
    }));

    this.logger.log(
      `Push envoyé à user:${userId} — "${notification.title}" (${tokens.length} token${tokens.length > 1 ? 's' : ''})`,
    );
    await this.deliver(messages);
  }

  async sendToAll(notification: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) {
    const tokens = await this.prisma.pushToken.findMany({
      select: { token: true },
    });

    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      title: notification.title,
      body: notification.body,
      data: notification.data ?? {},
      sound: 'default',
      priority: 'high',
    }));

    this.logger.log(
      `Push broadcast à TOUS — "${notification.title}" (${tokens.length} tokens)`,
    );
    return this.sendBatched(messages);
  }

  async sendToMany(
    userIds: string[],
    notification: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
    },
  ) {
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId: { in: userIds } },
    });

    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      title: notification.title,
      body: notification.body,
      data: notification.data ?? {},
      sound: 'default',
      priority: 'high',
    }));

    this.logger.log(
      `Push envoyé à ${userIds.length} utilisateur(s) — "${notification.title}" (${tokens.length} tokens)`,
    );
    return this.sendBatched(messages);
  }

  async sendBatched(messages: ExpoPushMessage[]) {
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < messages.length; i += this.EXPO_BATCH_SIZE) {
      const batch = messages.slice(i, i + this.EXPO_BATCH_SIZE);
      const result = await this.deliver(batch);
      sent += result.sent;
      failed += result.failed;
    }
    return { sent, failed };
  }

  private async deliver(
    messages: ExpoPushMessage[],
    retries = 3,
    backoffMs = 1000,
  ): Promise<{ sent: number; failed: number }> {
    if (messages.length === 0) return { sent: 0, failed: 0 };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(this.expoUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(messages),
        });

        if (!response.ok) {
          this.logger.error(
            `Expo Push API error: ${response.status} ${response.statusText}`,
          );
          if (attempt < retries) {
            await this.sleep(backoffMs * attempt);
            continue;
          }
          return { sent: 0, failed: messages.length };
        }

        const body = await response.json();
        const tickets: ExpoPushTicket[] = Array.isArray(body) ? body : [];

        if (tickets.length === 0) {
          if (body.errors) {
            this.logger.error('Expo Push API request error:', body.errors);
          }
          return { sent: 0, failed: messages.length };
        }

        const errors = tickets.filter((t) => t.status === 'error');
        const okCount = tickets.filter((t) => t.status === 'ok').length;

        if (errors.length > 0) {
          this.logger.warn(
            `${errors.length}/${tickets.length} notifications push en échec`,
          );

          const invalidTokens = errors
            .filter(
              (t) =>
                t.details?.error === 'DeviceNotRegistered' ||
                t.details?.error === 'InvalidCredentials',
            )
            .map((t) => t.message)
            .filter(Boolean) as string[];

          if (invalidTokens.length > 0) {
            await this.prisma.pushToken.deleteMany({
              where: { token: { in: invalidTokens } },
            });
            this.logger.log(
              `${invalidTokens.length} tokens invalides nettoyés`,
            );
          }
        }

        return { sent: okCount, failed: errors.length };
      } catch (error) {
        this.logger.error(
          `Erreur envoi push Expo (tentative ${attempt}/${retries}):`,
          error,
        );
        if (attempt < retries) {
          await this.sleep(backoffMs * attempt);
        } else {
          return { sent: 0, failed: messages.length };
        }
      }
    }

    return { sent: 0, failed: messages.length };
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
