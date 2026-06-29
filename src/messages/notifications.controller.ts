import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from '../notifications/notifications.service';
import { PushService } from '../notifications/push.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/user.decorator';
import {
  RegisterPushTokenDto,
  UnregisterPushTokenDto,
} from '../notifications/dto/register-push-token.dto';
import { UpdatePrefsDto } from '../notifications/dto/update-prefs.dto';

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
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'unreadOnly', required: false })
  @ApiQuery({
    name: 'types',
    required: false,
    description: 'Types séparés par des virgules',
  })
  async getHistory(
    @User() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('types') types?: string,
  ) {
    return this.notificationsService.getHistory(user.id, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      unreadOnly: unreadOnly === 'true',
      types: types ? types.split(',') : undefined,
    });
  }

  @Get('unread')
  @ApiOperation({ summary: 'Nombre de notifications non lues' })
  async getUnreadCount(@User() user: any) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  async markAsRead(@User() user: any, @Param('id') id: string) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Tout marquer comme lu' })
  async markAllAsRead(@User() user: any) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une notification' })
  async delete(@User() user: any, @Param('id') id: string) {
    return this.notificationsService.delete(user.id, id);
  }

  @Post('push/register')
  @ApiOperation({ summary: 'Enregistrer un token push' })
  async registerPushToken(
    @User() user: any,
    @Body() dto: RegisterPushTokenDto,
  ) {
    await this.pushService.registerToken(user.id, dto.token, dto.platform);
    return { message: 'Token push enregistré' };
  }

  @Post('push/unregister')
  @ApiOperation({ summary: 'Désinscrire un token push' })
  async unregisterPushToken(
    @User() user: any,
    @Body() dto: UnregisterPushTokenDto,
  ) {
    await this.pushService.unregisterToken(user.id, dto.token);
    return { message: 'Token push désinscrit' };
  }

  @Get('prefs')
  @ApiOperation({ summary: 'Préférences de notification' })
  async getPreferences(@User() user: any) {
    return this.notificationsService.getPreferences(user.id);
  }

  @Patch('prefs')
  @ApiOperation({ summary: 'Modifier les préférences' })
  async updatePreferences(@User() user: any, @Body() dto: UpdatePrefsDto) {
    return this.notificationsService.updatePreferences(user.id, dto);
  }
}
