/**
 * sms.controller.ts — Contrôleur REST de synchronisation SMS.
 *
 * Endpoints :
 *   POST /sms/sync   → Synchroniser les SMS du client connecté
 *
 * Sécurité :
 *   - Protégé par JWT (JwtAuthGuard)
 *   - Le customerId est résolu automatiquement depuis le token
 *     via la table user_bank_connections
 *   - Le body N'ACCEPTE PAS de customerId (impossible d'usurper)
 */

import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SmsService } from './sms.service';

@ApiTags('SMS Sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Synchroniser les SMS Mobile Money',
    description:
      "Reçoit les SMS bruts depuis l'app mobile, les parse, déduplique et insère en base. " +
      'Le customerId est résolu depuis le token JWT.',
  })
  async syncSms(
    @Req() req: any,
    @Body('messages')
    messages: {
      id: number;
      address: string;
      body: string;
      dateSent: string | Date;
    }[],
  ) {
    return this.smsService.syncSmsFromUser(req.user.id, messages);
  }
}
