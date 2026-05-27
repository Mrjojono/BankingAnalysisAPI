import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  constructor(private mailerService: MailerService) {}

  async sendMail(params: {
    to: string | string[];
    subject: string;
    template: string;
    context: ISendMailOptions['context'];
  }) {
    try {
      const emailsList = Array.isArray(params.to) ? params.to : [params.to];
      if (!emailsList) {
        throw new Error(
          `No recipients found in MAIL_TO env var, please check your .env file`,
        );
      }
      const sendMailParams = {
        to: emailsList,
        from: process.env.MAIL_FROM,
        subject: params.subject,
        template: params.template,
        context: params.context,
      };
      const response = await this.mailerService.sendMail(sendMailParams);
      this.logger.log(
        `Email sent successfully to recipients with the following parameters : ${JSON.stringify(
          sendMailParams,
        )}`,
        response,
      );
    } catch (error) {
      this.logger.error(
        `Error while sending mail with the following parameters : ${JSON.stringify(
          params,
        )}`,
        error,
      );
    }
  }
}
