import { Global, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsScheduler } from './notifications.scheduler';
import { PushService } from './push.service';
import { PrismaService } from '../prisma/prisma.service';

@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    PushService,
    NotificationsScheduler,
    PrismaService,
  ],
  exports: [NotificationsService, NotificationsGateway, PushService],
})
export class NotificationsModule {}
