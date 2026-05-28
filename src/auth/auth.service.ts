import {
  Injectable,
  UnauthorizedException,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as jwt from 'jsonwebtoken';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  generateOtp,
  comparePassword,
  hashPassword,
  registerKey,
  parseState,
  registerOtpKey,
  RegisterState,
  signToken,
  validateToken,
  forgotPasswordOtpKey,
  logAuth,
  forgotPasswordKey,
} from './auth.utils';
import { RedisService } from '../redis/redis.service';
import { MailerService } from '@nestjs-modules/mailer';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private mailer: MailerService,
  ) {}

  private extractRequestInfo(req: any) {
    return {
      ipAddress: req?.ip || req?.connection?.remoteAddress || null,
      userAgent: req?.headers?.['user-agent'] || null,
    };
  }

  private sendOtp = async (contact: string, otp: string) => {
    await this.mailer.sendMail({
      to: contact,
      subject: 'Votre code de vérification',
      template: 'otp-code',
      context: { otpCode: otp },
    });
  };

  private async findBankCustomer(accountNumber: string) {
    const bankCustomer = await this.prisma.bankCustomer.findUnique({
      where: { accountNumber },
      include: { userConnection: true },
    });
    if (!bankCustomer) {
      throw new UnauthorizedException('Compte introuvable ou invalide');
    }
    return bankCustomer;
  }

  private async getRegisterState(accountNumber: string) {
    const state = await this.redis.get(registerKey(accountNumber));
    if (!state) {
      throw new UnauthorizedException('Session expirée. Recommencez.');
    }
    return JSON.parse(state) as RegisterState;
  }

  private verifyContact(
    bankCustomer: any,
    contact: string,
    contactType: 'email' | 'phone',
  ) {
    const accountEmail = bankCustomer.email;
    const accountPhone = bankCustomer.telephone;

    const matches =
      contactType === 'email'
        ? accountEmail === contact
        : accountPhone === contact;

    if (!matches) {
      throw new UnauthorizedException(
        `Le ${contactType} ne correspond pas au compte bancaire`,
      );
    }
  }

  private async sendAndStoreOtp(accountNumber: string, contact: string) {
    const otp = generateOtp();
    await this.redis.set(registerOtpKey(accountNumber), otp, 300);
    await this.sendOtp(contact, otp);
    this.logger.log(`OTP envoyé à : ${contact}`);
  }

  private async checkOtp(accountNumber: string, otp: string) {
    const storedOtp = await this.redis.get(registerOtpKey(accountNumber));
    if (!storedOtp) {
      throw new UnauthorizedException('Code OTP expiré.');
    }
    if (storedOtp !== otp) {
      throw new UnauthorizedException('Code OTP invalide');
    }
    await this.redis.delete(registerOtpKey(accountNumber));
  }

  private async createUser(state: RegisterState, password: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: state.contact },
    });

    if (existingUser) {
      throw new BadRequestException('Un compte app existe déjà avec cet email');
    }

    const bankCustomer = await this.prisma.bankCustomer.findUnique({
      where: { id: state.customerId },
      include: { userConnection: true },
    });

    if (bankCustomer?.userConnection) {
      throw new BadRequestException(
        'Ce compte bancaire a déjà un compte app activé',
      );
    }

    const user = await this.prisma.user.create({
      data: {
        email: state.contact,
        password: await hashPassword(password),
        role: 'CLIENT',
        mfaEnabled: false,
      },
    });

    await this.prisma.userBankConnection.create({
      data: {
        userId: user.id,
        bankCustomerId: state.customerId,
        role: 'OWNER',
      },
    });

    this.logger.log(
      `User créé et lié au compte : ${user.email} → ${bankCustomer?.accountNumber}`,
    );

    return user;
  }

  async register(
    dto: RegisterDto,
    req?: any,
  ): Promise<{ step: string; message: string; token?: string }> {
    const { ipAddress, userAgent } = req
      ? this.extractRequestInfo(req)
      : { ipAddress: null, userAgent: null };

    if (!dto.contact && !dto.otp && !dto.password) {
      const bankCustomer = await this.findBankCustomer(dto.accountNumber);

      if (bankCustomer.userConnection) {
        await logAuth(
          this.prisma,
          'registration_verify_contact',
          false,
          bankCustomer.email,
          null,
          ipAddress,
          userAgent,
          { reason: 'account_already_linked' },
        );

        throw new BadRequestException('Ce compte a déjà un compte app activé');
      }

      await this.redis.set(
        registerKey(dto.accountNumber),
        JSON.stringify({
          step: 'verify_contact',
          customerId: bankCustomer.id,
          accountNumber: dto.accountNumber,
        }),
        600,
      );

      await logAuth(
        this.prisma,
        'registration_verify_contact',
        true,
        bankCustomer.email,
        null,
        ipAddress,
        userAgent,
      );

      return {
        step: 'verify_contact',
        message: 'Compte trouvé. Entrez votre email ou téléphone.',
      };
    }

    if (dto.contact && dto.contactType && !dto.otp && !dto.password) {
      const state = await this.getRegisterState(dto.accountNumber);
      const bankCustomer = await this.findBankCustomer(dto.accountNumber);

      this.verifyContact(bankCustomer, dto.contact, dto.contactType);

      await this.sendAndStoreOtp(dto.accountNumber, dto.contact);

      await logAuth(
        this.prisma,
        'registration_send_otp',
        true,
        dto.contact,
        null,
        ipAddress,
        userAgent,
        { contactType: dto.contactType },
      );

      await this.redis.set(
        registerKey(dto.accountNumber),
        JSON.stringify({
          ...state,
          step: 'verify_otp',
          contact: dto.contact,
          contactType: dto.contactType,
        }),
        600,
      );

      return { step: 'verify_otp', message: 'Code OTP envoyé.' };
    }

    if (dto.otp && !dto.password) {
      const state = await this.getRegisterState(dto.accountNumber);

      try {
        await this.checkOtp(dto.accountNumber, dto.otp);

        await logAuth(
          this.prisma,
          'registration_verify_otp',
          true,
          state.contact,
          null,
          ipAddress,
          userAgent,
        );
      } catch (error) {
        await logAuth(
          this.prisma,
          'registration_verify_otp',
          false,
          state.contact,
          null,
          ipAddress,
          userAgent,
          { reason: error.message },
        );
        throw error;
      }

      await this.redis.set(
        registerKey(dto.accountNumber),
        JSON.stringify({
          ...state,
          step: 'set_password',
        }),
        600,
      );

      return {
        step: 'set_password',
        message: 'OTP validé. Créez votre mot de passe.',
      };
    }

    if (dto.password) {
      const state = await this.getRegisterState(dto.accountNumber);

      try {
        const user = await this.createUser(state, dto.password);
        await this.redis.delete(registerKey(dto.accountNumber));

        await logAuth(
          this.prisma,
          'account_created',
          true,
          user.email,
          user.id,
          ipAddress,
          userAgent,
          { accountNumber: dto.accountNumber },
        );

        this.logger.log(`Compte activé : ${dto.accountNumber}`);

        return {
          step: 'complete',
          message: 'Compte activé avec succès.',
          token: signToken({ id: user.id, email: user.email }),
        };
      } catch (error) {
        await logAuth(
          this.prisma,
          'account_creation_failed',
          false,
          state.contact,
          null,
          ipAddress,
          userAgent,
          { reason: error.message },
        );
        throw error;
      }
    }

    throw new UnauthorizedException('Requête invalide');
  }

  async resendOtp(
    accountNumber: string,
    req?: any,
  ): Promise<{ message: string }> {
    const state = parseState(await this.redis.get(registerKey(accountNumber)));
    const { ipAddress, userAgent } = req
      ? this.extractRequestInfo(req)
      : { ipAddress: null, userAgent: null };

    if (!state || !state.contact) {
      await logAuth(
        this.prisma,
        'resend_otp',
        false,
        state?.contact ?? null,
        null,
        ipAddress,
        userAgent,
        { reason: 'session_expired' },
      );

      throw new UnauthorizedException(
        'Session expirée. Recommencez depuis le début.',
      );
    }

    const existingOtp = await this.redis.get(registerOtpKey(accountNumber));
    if (existingOtp) {
      await logAuth(
        this.prisma,
        'resend_otp',
        false,
        state.contact,
        null,
        ipAddress,
        userAgent,
        { reason: 'otp_already_active' },
      );

      throw new UnauthorizedException(
        "Un code OTP est déjà actif. Attendez avant d'en demander un nouveau.",
      );
    }

    const otp = generateOtp();
    await this.redis.set(registerOtpKey(accountNumber), otp, 300);
    await this.sendOtp(state.contact, otp);

    await logAuth(
      this.prisma,
      'resend_otp',
      true,
      state.contact,
      null,
      ipAddress,
      userAgent,
    );

    this.logger.log(`OTP renvoyé à : ${state.contact}`);
    return { message: 'Nouveau code OTP envoyé.' };
  }

  async login(dto: LoginDto, req?: any): Promise<string> {
    const { ipAddress, userAgent } = req
      ? this.extractRequestInfo(req)
      : { ipAddress: null, userAgent: null };

    this.logger.log(`Tentative de connexion : ${dto.contact}`);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.contact },
      include: { bankConnections: { include: { bankCustomer: true } } },
    });

    if (!user) {
      await logAuth(
        this.prisma,
        'login',
        false,
        dto.contact,
        null,
        ipAddress,
        userAgent,
        { reason: 'user_not_found' },
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      await logAuth(
        this.prisma,
        'login',
        false,
        dto.contact,
        user.id,
        ipAddress,
        userAgent,
        { reason: 'biometric_required' },
      );

      throw new UnauthorizedException('Authentification biométrique requise');
    }

    const isPasswordValid = await comparePassword(dto.password, user.password);

    if (!isPasswordValid) {
      await logAuth(
        this.prisma,
        'login',
        false,
        dto.contact,
        user.id,
        ipAddress,
        userAgent,
        { reason: 'invalid_password' },
      );

      throw new UnauthorizedException('Invalid credentials');
    }

    await logAuth(
      this.prisma,
      'login',
      true,
      dto.contact,
      user.id,
      ipAddress,
      userAgent,
    );

    this.logger.log(`Connexion réussie : ${user.email}`);

    return signToken({ id: user.id, email: user.email });
  }

  /**
   * Fonction avec plusieurs étapes pour gérer le processus de récupération de mot de passe.
   * @param dto
   * @param req
   * @returns
   */
  async forgotPassword(
    dto: ForgotPasswordDto,
    req?: any,
  ): Promise<{ step: string; message: string; token?: string }> {
    const { ipAddress, userAgent } = req
      ? this.extractRequestInfo(req)
      : { ipAddress: null, userAgent: null };

    //verification de l'existence de l'utilisateur dans la base de données
    const user = await this.prisma.user.findUnique({
      where: { email: dto.contact },
    });
    if (!user) {
      await logAuth(
        this.prisma,
        'forgot_password',
        false,
        dto.contact,
        null,
        ipAddress,
        userAgent,
        { reason: 'user_not_found' },
      );
      throw new NotFoundException('User not found');
    }

    // ÉTAPE 1  Envoyer l'OTP , ici l'otp n'est pas envoyer a l'email entrer  par l'utilisateur mais on s'assure que l'email est envoyer a celui verfier dans la base de donneés
    if (!dto.otp && !dto.newPassword) {
      const existingOtp = await this.redis.get(
        forgotPasswordOtpKey(dto.contact),
      );

      if (existingOtp) {
        throw new UnauthorizedException(
          "Un code est déjà actif. Attendez avant d'en demander un nouveau.",
        );
      }

      const otp = generateOtp();
      await this.redis.set(forgotPasswordOtpKey(user.email), otp, 300);
      await this.redis.set(
        forgotPasswordKey(user.email),
        JSON.stringify({
          step: 'verify_otp',
          userId: user.id,
          contact: dto.contact,
        }),
        600,
      );

      await this.sendOtp(user.email, otp);
      await logAuth(
        this.prisma,
        'forgot_password',
        true,
        dto.contact,
        user.id,
        ipAddress,
        userAgent,
      );
      this.logger.log(`OTP reset password envoyé à : ${user.email}`);

      return { step: 'verify_otp', message: 'Code OTP envoyé.' };
    }

    // ÉTAPE 2  Vérifier l'OTP
    if (dto.otp && !dto.newPassword) {
      const state = parseState(
        await this.redis.get(forgotPasswordKey(user.email)),
      );

      const storedOtp = await this.redis.get(forgotPasswordOtpKey(user.email));
      if (!storedOtp) {
        throw new UnauthorizedException(
          'Code OTP expiré. Demandez un nouveau code.',
        );
      }

      if (storedOtp !== dto.otp) {
        await logAuth(
          this.prisma,
          'forgot_password_verify_otp',
          false,
          user.email,
          null,
          ipAddress,
          userAgent,
          { reason: 'invalid_otp' },
        );
        throw new UnauthorizedException('Code OTP invalide');
      }

      await this.redis.delete(forgotPasswordOtpKey(user.email));
      await this.redis.set(
        forgotPasswordKey(user.email),
        JSON.stringify({ ...state, step: 'reset_password' }),
        600,
      );

      await logAuth(
        this.prisma,
        'forgot_password_verify_otp',
        true,
        user.email,
        state.userId,
        ipAddress,
        userAgent,
      );
      return {
        step: 'reset_password',
        message: 'OTP validé. Entrez votre nouveau mot de passe.',
      };
    }

    // ÉTAPE 3 — Réinitialiser le mot de passe
    if (dto.newPassword) {
      const state = parseState(
        await this.redis.get(forgotPasswordKey(user.email)),
      );

      if (state.step !== 'reset_password') {
        throw new UnauthorizedException('Étape invalide. Recommencez.');
      }

      await this.prisma.user.update({
        where: { id: state.userId },
        data: { password: await hashPassword(dto.newPassword) },
      });

      await this.redis.delete(forgotPasswordKey(user.email));
      await logAuth(
        this.prisma,
        'reset_password',
        true,
        user.email,
        state.userId,
        ipAddress,
        userAgent,
      );
      this.logger.log(`Mot de passe réinitialisé pour : ${user.email}`);

      return {
        step: 'complete',
        message: 'Mot de passe réinitialisé avec succès.',
      };
    }

    throw new UnauthorizedException('Requête invalide');
  }

  validateToken(token: string): jwt.JwtPayload {
    return validateToken(token);
  }
}
