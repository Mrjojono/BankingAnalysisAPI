import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { MailService } from './mail.service';

@ApiTags('Admin - Mail')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get()
  @ApiOperation({ summary: 'Send a test email (dev only)' })
  async sendMail() {
    const appUrl = process.env.APP_URL || 'https://app.orabank.com';
    await this.mailService.sendMail({
      to: 'joan@gmail.com',
      subject: 'Welcome to the realm of NestJS',
      template: 'signup-confirmation-template',
      context: {
        name: 'Jhon Doe',
        verificationLink: `${appUrl}/verify?token=test123`,
      },
    });
    return {
      message: 'Email envoyé avec succès',
    };
  }
}
