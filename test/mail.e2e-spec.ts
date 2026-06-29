import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from '../src/mail/mail.service';
import { MailModule } from '../src/mail/mail.module';

const TEST_EMAIL = 'nutsukpuijoan@gmail.com';

describe('MailModule (e2e) — envoi de tous les templates', () => {
  let module: TestingModule;
  let mailService: MailService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [MailModule],
    }).compile();
    await module.init();

    mailService = module.get<MailService>(MailService);
  });

  afterAll(async () => {
    await module.close();
  });

  it('devrait envoyer le template otp-code', async () => {
    if (!process.env.MAIL_E2E_TEST) return;

    await mailService.sendMail({
      to: TEST_EMAIL,
      subject: '[TEST] Votre code de vérification',
      template: 'otp-code',
      context: { otpCode: '123456' },
    });
  });

  it('devrait envoyer le template signup-confirmation-template', async () => {
    if (!process.env.MAIL_E2E_TEST) return;

    const appUrl = process.env.APP_URL || 'https://app.orabank.com';
    await mailService.sendMail({
      to: TEST_EMAIL,
      subject: '[TEST] Confirmation d\'inscription',
      template: 'signup-confirmation-template',
      context: {
        name: 'Nestor K.',
        verificationLink: `${appUrl}/verify?token=test123`,
      },
    });
  });

  it('devrait envoyer le template notification', async () => {
    if (!process.env.MAIL_E2E_TEST) return;

    await mailService.sendMail({
      to: TEST_EMAIL,
      subject: '[TEST] Notification Orabank',
      template: 'notification',
      context: {
        title: 'Conseil financier',
        body: 'Pensez à épargner au moins 10% de vos revenus chaque mois.',
        type: 'EDUCATIONAL',
        severity: 'INFO',
      },
    });
  });

  it('devrait envoyer les 3 types de sévérité notification', async () => {
    if (!process.env.MAIL_E2E_TEST) return;

    for (const severity of ['INFO', 'WARNING', 'CRITICAL'] as const) {
      await mailService.sendMail({
        to: TEST_EMAIL,
        subject: `[TEST] Notification ${severity}`,
        template: 'notification',
        context: {
          title: `Notification de type ${severity}`,
          body: `Ceci est un test de notification avec sévérité ${severity}.`,
          type: 'SYSTEM',
          severity,
        },
      });
    }
  });
});
