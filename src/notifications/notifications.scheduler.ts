import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';

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
    this.logger.log('Exécution du conseil quotidien...');

    const tips = [
      {
        title: 'Astuce du jour',
        body: 'Suivez vos dépenses quotidiennement pour mieux maîtriser votre budget. 5 minutes suffisent !',
      },
      {
        title: 'Objectif épargne',
        body: "Essayez d'épargner au moins 10% de vos revenus chaque mois. Votre futur vous remerciera.",
      },
      {
        title: 'Sécurité financière',
        body: 'Activez les notifications SMS pour être alerté de chaque mouvement sur votre compte.',
      },
      {
        title: 'Crédit responsable',
        body: 'Avant de souscrire un crédit, vérifiez que vos mensualités ne dépassent pas 35% de vos revenus.',
      },
    ];

    const tip = tips[Math.floor(Math.random() * tips.length)];

    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });

    for (const user of users) {
      await this.notificationsService.create(user.id, {
        type: 'EDUCATIONAL',
        title: tip.title,
        body: tip.body,
        severity: 'INFO',
        link: '/education',
      });
    }

    this.logger.log(`Conseil quotidien envoyé à ${users.length} utilisateurs`);
  }

  @Cron('0 8 * * 1')
  async weeklyDigest() {
    this.logger.log('Exécution du résumé hebdomadaire...');

    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, email: true },
    });

    for (const user of users) {
      const unreadNotifications = await this.prisma.notification.count({
        where: {
          userId: user.id,
          isRead: false,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      });

      await this.notificationsService.create(user.id, {
        type: 'WEEKLY_DIGEST',
        title: 'Votre résumé hebdomadaire',
        body: `Vous avez ${unreadNotifications} conseil${unreadNotifications > 1 ? 's' : ''} en attente. Consultez votre tableau de bord pour voir les détails.`,
        severity: 'INFO',
        data: { unreadNotifications },
        link: '/',
      });
    }

    this.logger.log(`Résumé hebdo envoyé à ${users.length} utilisateurs`);
  }
}
