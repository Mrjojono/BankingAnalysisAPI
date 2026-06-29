import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from './push.service';
import { MailService } from '../mail/mail.service';
import type { NotificationType, NotificationChannel } from '../../generated/prisma/client';
import type { UpdatePrefsDto } from './dto/update-prefs.dto';
type NotificationInput = {
  title: string;
  body: string;
  type: NotificationType;
  channel?: NotificationChannel;
  data?: Record<string, unknown>;
  severity?: string;
  link?: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private pushService: PushService,
    private mailService: MailService,
  ) {}

  async create(userId: string, input: NotificationInput) {
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    const isTypeAllowed =
      !prefs?.types ||
      (prefs.types as string[]).includes(input.type);

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: input.type,
        channel: input.channel ?? 'IN_APP',
        title: input.title,
        body: input.body,
        data: (input.data ?? undefined) as any,
        severity: input.severity ?? 'INFO',
        link: input.link ?? undefined,
      },
    });

    if (prefs?.push !== false && isTypeAllowed) {
      this.pushService.sendToUser(userId, {
        title: input.title,
        body: input.body,
        data: { type: input.type, notificationId: notification.id, ...(input.data ?? {}) },
      });
    }

    if (prefs?.email === true && isTypeAllowed) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (user?.email) {
        this.mailService.sendMail({
          to: user.email,
          subject: input.title,
          template: 'notification',
          context: {
            title: input.title,
            body: input.body,
            type: input.type,
            severity: input.severity ?? 'INFO',
          },
        });
      }
    }

    return notification;
  }

  async createMany(
    userIds: string[],
    input: NotificationInput,
  ) {
    const results: any[] = [];
    for (const userId of userIds) {
      const n = await this.create(userId, input);
      results.push(n);
    }
    return results;
  }

  async getHistory(
    userId: string,
    params: {
      types?: string[];
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
    } = {},
  ) {
    const { types, page = 1, limit = 20, unreadOnly = false } = params;

    const where: any = { userId };
    if (types && types.length > 0) where.type = { in: types };
    if (unreadOnly) where.isRead = false;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnread(userId: string) {
    return this.getHistory(userId, { unreadOnly: true });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification introuvable');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { message: 'Toutes les notifications marquées comme lues' };
  }

  async delete(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification introuvable');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: 'Notification supprimée' };
  }

  async getPreferences(userId: string) {
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    return {
      push: prefs?.push ?? true,
      email: prefs?.email ?? false,
      types: prefs?.types ?? null,
    };
  }

  async updatePreferences(userId: string, dto: UpdatePrefsDto) {
    const data: any = {};
    if (dto.push !== undefined) data.push = dto.push;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.types !== undefined) data.types = dto.types;

    await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    return this.getPreferences(userId);
  }
}
