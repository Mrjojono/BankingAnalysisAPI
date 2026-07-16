import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { MailModule } from './mail/mail.module';
import { RedisModule } from './redis/redis.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { EligibilityModule } from './eligibility/eligibility.module';
import { GatewayModule } from './gateway/gateway.module';
import { AdminModule } from './admin/admin.module';
import { SmsModule } from './sms/sms.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EducationModule } from './education/education.module';
import { QuizModule } from './quiz/quiz.module';
import { SavingsModule } from './savings/savings.module';
import { EncryptionModule } from './encryption/encryption.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { UserModule } from './user/user.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 200,
      },
    ]),
    AuthModule,
    PrismaModule,
    MailModule,
    RedisModule,
    AnalyticsModule,
    EligibilityModule,
    GatewayModule,
    AdminModule,
    SmsModule,
    NotificationsModule,
    EducationModule,
    QuizModule,
    SavingsModule,
    EncryptionModule,
    MonitoringModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
