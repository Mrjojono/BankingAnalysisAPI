import { Controller, Get } from '@nestjs/common';
import { MailService } from './mail.service';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get()
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
