import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';

type RecurrenceAdd = { DAILY: number; WEEKLY: number; MONTHLY: number };
const RECURRENCE_MS: RecurrenceAdd = {
  DAILY: 24 * 60 * 60 * 1000,
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
  MONTHLY: 30 * 24 * 60 * 60 * 1000,
};

@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private pushService: PushService,
  ) {}

  @Cron('0 10 * * 1-5')
  async dailyTip() {
    this.logger.log('dailyTip started');

    const tips = [
      { title: 'Astuce du jour', body: 'Suivez vos dépenses quotidiennement pour mieux maîtriser votre budget. 5 minutes suffisent !' },
      { title: 'Objectif epargne', body: "Essayez d'epargner au moins 10% de vos revenus chaque mois. Votre futur vous remerciera." },
      { title: 'Securite financiere', body: 'Activez les notifications SMS pour etre alerte de chaque mouvement sur votre compte.' },
      { title: 'Credit responsable', body: 'Avant de souscrire un credit, verifiez que vos mensualites ne depassent pas 35% de vos revenus.' },
    ];

    const tip = tips[Math.floor(Math.random() * tips.length)];

    try {
      const users = await this.prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });

      const userIds = users.map((u) => u.id);
      if (userIds.length === 0) return;

      await this.notificationsService.createMany(userIds, {
        type: 'EDUCATIONAL',
        title: tip.title,
        body: tip.body,
        severity: 'INFO',
        link: '/education',
      });

      await this.pushService.sendToAll({
        title: tip.title,
        body: tip.body,
        data: { type: 'EDUCATIONAL' },
      });

      this.logger.log(`dailyTip sent to ${userIds.length} users`);
    } catch (err) {
      this.logger.error(`dailyTip failed: ${err.message}`);
    }
  }

  @Cron('0 8 * * 1')
  async weeklyDigest() {
    this.logger.log('weeklyDigest started');

    try {
      const users = await this.prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });

      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const unreadCounts = await this.prisma.notification.groupBy({
        by: ['userId'],
        where: {
          userId: { in: users.map((u) => u.id) },
          isRead: false,
          createdAt: { gte: oneWeekAgo },
        },
        _count: true,
      });

      const countMap = new Map(unreadCounts.map((uc) => [uc.userId, uc._count]));

      for (const user of users) {
        const unread = countMap.get(user.id) ?? 0;
        await this.notificationsService.create(user.id, {
          type: 'WEEKLY_DIGEST',
          title: 'Votre resume hebdomadaire',
          body: `Vous avez ${unread} conseil${unread > 1 ? 's' : ''} en attente. Consultez votre tableau de bord.`,
          severity: 'INFO',
          data: { unreadNotifications: unread },
          link: '/',
        });
      }

      this.logger.log(`weeklyDigest sent to ${users.length} users`);
    } catch (err) {
      this.logger.error(`weeklyDigest failed: ${err.message}`);
    }
  }

  /*
   * Runs every 5 minutes. Finds due ScheduledNotification records,
   * delivers them via createMany + push broadcast, then either:
   * - deletes one-shot notifications after delivery, or
   * - recalculates scheduledAt for recurring (DAILY/WEEKLY/MONTHLY).
   */
  @Cron('*/5 * * * *')
  async deliverScheduled() {
    const now = new Date();
    const due = await this.prisma.scheduledNotification.findMany({
      where: {
        active: true,
        scheduledAt: { lte: now },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    if (due.length === 0) return;

    this.logger.log(`Livraison de ${due.length} notification(s) programmée(s)`);

    for (const notif of due) {
      try {
        const type = notif.type as any;

        if (notif.targetType === 'all') {
          const users = await this.prisma.user.findMany({
            where: { deletedAt: null },
            select: { id: true },
          });
          await this.notificationsService.createMany(
            users.map((u) => u.id),
            { title: notif.title, body: notif.body, type, severity: notif.severity, link: '/' },
          );
          await this.pushService.sendToAll({
            title: notif.title, body: notif.body, data: { type },
          });
        } else if (notif.targetType === 'user_ids' && Array.isArray(notif.targetIds)) {
          const userIds = notif.targetIds as string[];
          await this.notificationsService.createMany(userIds, {
            title: notif.title, body: notif.body, type, severity: notif.severity, link: '/',
          });
          await this.pushService.sendToMany(userIds, {
            title: notif.title, body: notif.body, data: { type },
          });
        } else if (notif.targetType === 'customer_targets' && Array.isArray(notif.targetIds)) {
          const customers = await this.prisma.bankCustomer.findMany({
            where: {
              OR: [
                { id: { in: (notif.targetIds as string[]).filter((c: string) => /^[0-9a-f-]{36}$/i.test(c)) } },
                { email: { in: (notif.targetIds as string[]).filter((c: string) => !/^[0-9a-f-]{36}$/i.test(c)) } },
              ],
            },
            include: { userConnection: { select: { userId: true } } },
          });
          const userIds = customers
            .map((c) => c.userConnection?.userId)
            .filter((id): id is string => !!id);
          if (userIds.length > 0) {
            await this.notificationsService.createMany(userIds, {
              title: notif.title, body: notif.body, type, severity: notif.severity, link: '/',
            });
            await this.pushService.sendToMany(userIds, {
              title: notif.title, body: notif.body, data: { type },
            });
          }
        }

        if (notif.recurrence && notif.recurrence in RECURRENCE_MS) {
          const ms = RECURRENCE_MS[notif.recurrence as keyof RecurrenceAdd];
          await this.prisma.scheduledNotification.update({
            where: { id: notif.id },
            data: {
              lastSentAt: now,
              scheduledAt: new Date(now.getTime() + ms),
            },
          });
        } else {
          await this.prisma.scheduledNotification.delete({ where: { id: notif.id } });
        }
      } catch (err) {
        this.logger.error(`Erreur livraison notification ${notif.id}: ${err}`);
      }
    }
  }
}
