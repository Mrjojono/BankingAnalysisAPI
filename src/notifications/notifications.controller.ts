import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserId } from '../auth/user-id.decorator';
import { UpdatePrefsDto } from './dto/update-prefs.dto';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushService: PushService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Historique des notifications' })
  async findAll(
    @UserId() userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.notificationsService.getHistory(userId, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Get('unread')
  @ApiOperation({ summary: 'Notifications non lues' })
  async findUnread(@UserId() userId: string) {
    return this.notificationsService.getUnread(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer comme lue' })
  async markAsRead(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.notificationsService.markAsRead(userId, id);
    return { success: true };
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Tout marquer comme lu' })
  async markAllAsRead(@UserId() userId: string) {
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Préférences de notification' })
  async getPreferences(@UserId() userId: string) {
    return this.notificationsService.getPreferences(userId);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Mettre à jour les préférences' })
  async updatePreferences(
    @UserId() userId: string,
    @Body() dto: UpdatePrefsDto,
  ) {
    return this.notificationsService.updatePreferences(userId, dto);
  }

  @Post('push/register')
  @ApiOperation({ summary: "Enregistrer un token push Expo" })
  async registerPushToken(
    @UserId() userId: string,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.pushService.registerToken(userId, dto.token);
  }

  @Post('push/unregister')
  @ApiOperation({ summary: "Désenregistrer un token push" })
  async unregisterPushToken(
    @UserId() userId: string,
    @Body() dto: RegisterPushTokenDto,
  ) {
    await this.pushService.unregisterToken(userId, dto.token);
    return { success: true };
  }
}
