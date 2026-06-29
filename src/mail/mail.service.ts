import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import * as pug from 'pug';
import * as path from 'path';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY non définie — les emails ne seront pas envoyés',
      );
    }
    this.resend = new Resend(apiKey || 're_placeholder');
    this.from = process.env.MAIL_FROM || 'noreply@orabank.com';
  }

  async sendMail(params: {
    to: string | string[];
    subject: string;
    template: string;
    context: Record<string, any>;
  }) {
    if (!process.env.RESEND_API_KEY) {
      this.logger.warn('RESEND_API_KEY manquante — email non envoyé');
      return;
    }

    try {
      const templatePath = path.join(
        process.cwd(),
        'src',
        'templates',
        `${params.template}.pug`,
      );
      const html = pug.compileFile(templatePath)(params.context);

      const recipients = Array.isArray(params.to) ? params.to : [params.to];

      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to: recipients,
        subject: params.subject,
        html,
      });

      if (error) {
        this.logger.error(`Erreur Resend: ${error.message}`, error);
        return;
      }

      this.logger.log(
        `Email envoyé à ${recipients.join(', ')} — id: ${data?.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Erreur envoi email (template: ${params.template})`,
        error,
      );
    }
  }
}
