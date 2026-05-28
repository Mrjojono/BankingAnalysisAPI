import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { MailModule } from './mail/mail.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [AuthModule, PrismaModule, MailModule, RedisModule],
  controllers: [],
  providers: [PrismaService],
})
export class AppModule {}
