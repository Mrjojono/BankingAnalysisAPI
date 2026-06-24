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

  constructor(private prisma: PrismaService) {}

  async registerToken(userId: string, token: string, platform?: string) {
    const existing = await this.prisma.pushToken.findUnique({
      where: { token },
    });

    if (existing) {
      if (existing.userId !== userId) {
        await this.prisma.pushToken.update({
          where: { id: existing.id },
          data: { userId, platform },
        });
      } else if (platform) {
        await this.prisma.pushToken.update({
          where: { id: existing.id },
          data: { platform },
        });
      }
      return existing;
    }

    return this.prisma.pushToken.create({
      data: { userId, token, platform },
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

    await this.deliver(messages);
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

    await this.deliver(messages);
  }

  private async deliver(messages: ExpoPushMessage[]) {
    if (messages.length === 0) return;

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
        return;
      }

      const tickets: ExpoPushTicket[] = await response.json();
      const errors = tickets.filter((t) => t.status === 'error');

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
          this.logger.log(`${invalidTokens.length} tokens invalides nettoyés`);
        }
      }
    } catch (error) {
      this.logger.error('Erreur envoi push Expo:', error);
    }
  }
}
