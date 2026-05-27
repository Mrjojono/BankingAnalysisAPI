import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Module({
  imports: [ConfigModule],
  providers: [AuthService, PrismaService, RedisService],
  controllers: [AuthController],
})
export class AuthModule {}
