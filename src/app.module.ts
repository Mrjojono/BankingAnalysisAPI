import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { MailModule } from './mail/mail.module';
import { RedisModule } from './redis/redis.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { GatewayModule } from './gateway/gateway.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    MailModule,
    RedisModule,
    AnalyticsModule,
    GatewayModule,
  ],
  controllers: [AppController],
  providers: [PrismaService],
})
export class AppModule {}
