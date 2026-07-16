import {
  Injectable,
  UnauthorizedException,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type * as jwt from 'jsonwebtoken';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  generateOtp,
  comparePassword,
  hashPassword,
  registerKey,
  parseState,
  registerOtpKey,
  RegisterState,
  signAccessToken,
  signRefreshToken,
  signToken,
  signMfaToken,
  validateMfaToken,
  validateToken,
  validateRefreshToken,
  forgotPasswordOtpKey,
  logAuth,
  forgotPasswordKey,
  signSetPasswordToken,
  validateSetPasswordToken,
  setPasswordKey,
} from './auth.utils';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { MfaLoginDto } from './dto/mfa.dto';
import { authenticator, totp as totpClient } from '@otplib/preset-default';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private mailService: MailService,
  ) {}

  private extractRequestInfo(req: any) {
    return {
      ipAddress: req?.ip || req?.connection?.remoteAddress || null,
      userAgent: req?.headers?.['user-agent'] || null,
    };
  }

  private sendOtp = async (contact: string, otp: string) => {
    await this.mailService.sendMail({
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

  private async saveOtpToDb(userId: string, otp: string, type: string) {
    try {
      await this.prisma.otpCode.create({
        data: {
          userId,
          code: otp,
          type: type as any,
          expiresAt: new Date(Date.now() + 300 * 1000),
        },
      });
    } catch (error) {
      this.logger.error(`Erreur sauvegarde OTP en DB:`, error);
    }
  }

  private async sendAndStoreOtp(accountNumber: string, contact: string) {
    const otp = generateOtp();
    await this.redis.set(registerOtpKey(accountNumber), otp, 300);
    await this.sendOtp(contact, otp);

    const state = await this.getRegisterState(accountNumber);
    if (state.userId) {
      await this.saveOtpToDb(state.userId, otp, 'ACCOUNT_ACTIVATION');
    }

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

  private async createUser(state: RegisterState, password?: string) {
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
        password: password ? await hashPassword(password) : null,
        role: 'CLIENT',
        mfaEnabled: false,
        emailVerifiedAt: new Date(),
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
  ): Promise<{ step: string; message: string; token?: string; refreshToken?: string }> {
    const { ipAddress, userAgent } = req
      ? this.extractRequestInfo(req)
      : { ipAddress: null, userAgent: null };

    if (!dto.contact && !dto.otp) {
      const bankCustomer = await this.findBankCustomer(dto.accountNumber);

      if (bankCustomer.userConnection) {
        logAuth(
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

      logAuth(
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

    if (dto.contact && dto.contactType && !dto.otp) {
      const state = await this.getRegisterState(dto.accountNumber);
      const bankCustomer = await this.findBankCustomer(dto.accountNumber);

      this.verifyContact(bankCustomer, dto.contact, dto.contactType);

      await this.sendAndStoreOtp(dto.accountNumber, dto.contact);

      logAuth(
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

    if (dto.otp) {
      const state = await this.getRegisterState(dto.accountNumber);

      try {
        await this.checkOtp(dto.accountNumber, dto.otp);

        logAuth(
          this.prisma,
          'registration_verify_otp',
          true,
          state.contact,
          null,
          ipAddress,
          userAgent,
        );
      } catch (error) {
        logAuth(
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

      const user = await this.createUser(state);
      await this.redis.delete(registerKey(dto.accountNumber));

      const setPasswordJwt = signSetPasswordToken({
        sub: user.id,
        type: 'set_password',
        accountNumber: dto.accountNumber,
      });

      const magicLink = `https://app.orabank.ci/auth/set-password?token=${setPasswordJwt}&acc=${dto.accountNumber}`;

      await this.mailService.sendMail({
        to: state.contact,
        subject: 'Créez votre mot de passe Orabank',
        template: 'set-password',
        context: { magicLink, accountNumber: dto.accountNumber },
      });

      logAuth(
        this.prisma,
        'registration_link_sent',
        true,
        user.email,
        user.id,
        ipAddress,
        userAgent,
        { accountNumber: dto.accountNumber },
      );

      this.logger.log(`Lien envoyé pour : ${dto.accountNumber}`);

      return {
        step: 'link_sent',
        message: 'Lien de création de mot de passe envoyé par email.',
      };
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
      logAuth(
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
      logAuth(
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

    logAuth(
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

  async login(
    dto: LoginDto,
    req?: any,
  ): Promise<{
    accessToken?: string;
    refreshToken?: string;
    user?: { id: string; email: string; role: string; username?: string };
    mfaRequired?: boolean;
    mfaToken?: string;
  }> {
    const { ipAddress, userAgent } = req
      ? this.extractRequestInfo(req)
      : { ipAddress: null, userAgent: null };

    this.logger.log(`Tentative de connexion : ${dto.contact}`);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.contact },
      include: { bankConnections: { include: { bankCustomer: true } } },
    });

    if (!user) {
      logAuth(
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
      logAuth(
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
      logAuth(
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

    // Si MFA activé, retourner un token temporaire
    if (user.mfaEnabled) {
      const mfaToken = signMfaToken({ id: user.id, mfa: true });

      logAuth(
        this.prisma,
        'login_mfa_pending',
        true,
        dto.contact,
        user.id,
        ipAddress,
        userAgent,
      );

      return { mfaRequired: true, mfaToken };
    }

    logAuth(
      this.prisma,
      'login',
      true,
      dto.contact,
      user.id,
      ipAddress,
      userAgent,
    );

    this.logger.log(`Connexion réussie : ${user.email}`);

    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        token: signRefreshToken({ sessionId: 'tmp' }),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: userAgent ?? undefined,
        ipAddress: ipAddress ?? undefined,
      },
    });

    const refreshToken = signRefreshToken({ sessionId: session.id });

    await this.prisma.session.update({
      where: { id: session.id },
      data: { token: refreshToken },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
    });

    const username = user.bankConnections[0]?.bankCustomer
      ? `${user.bankConnections[0].bankCustomer.firstName} ${user.bankConnections[0].bankCustomer.lastName ?? ''}`.trim()
      : undefined;

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role, username },
    };
  }

  async loginMfa(
    dto: MfaLoginDto,
    req?: any,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; role: string; username?: string };
  }> {
    const { ipAddress, userAgent } = req
      ? this.extractRequestInfo(req)
      : { ipAddress: null, userAgent: null };

    const payload = validateMfaToken(dto.mfaToken);

    if (!payload.mfa || !payload.id) {
      throw new UnauthorizedException('Token MFA invalide');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.id as string },
      include: { bankConnections: { include: { bankCustomer: true } } },
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedException('MFA non configuré');
    }

    try {
      totpClient.verify({ token: dto.code, secret: user.mfaSecret });
    } catch {
      logAuth(
        this.prisma,
        'login_mfa_verify',
        false,
        user.email,
        user.id,
        ipAddress,
        userAgent,
        { reason: 'invalid_totp' },
      );
      throw new UnauthorizedException('Code MFA invalide');
    }

    logAuth(
      this.prisma,
      'login_mfa_verify',
      true,
      user.email,
      user.id,
      ipAddress,
      userAgent,
    );

    this.logger.log(`Connexion MFA réussie : ${user.email}`);

    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        token: signRefreshToken({ sessionId: 'tmp' }),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: userAgent ?? undefined,
        ipAddress: ipAddress ?? undefined,
      },
    });

    const refreshToken = signRefreshToken({ sessionId: session.id });

    await this.prisma.session.update({
      where: { id: session.id },
      data: { token: refreshToken },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
    });

    const username = user.bankConnections[0]?.bankCustomer
      ? `${user.bankConnections[0].bankCustomer.firstName} ${user.bankConnections[0].bankCustomer.lastName ?? ''}`.trim()
      : undefined;

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role, username },
    };
  }

  async me(
    userId: string,
  ): Promise<{ id: string; email: string; role: string; username?: string; bankCustomerId?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { bankConnections: { include: { bankCustomer: true } } },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const bankConnection = user.bankConnections[0];
    const username = bankConnection?.bankCustomer
      ? `${bankConnection.bankCustomer.firstName} ${bankConnection.bankCustomer.lastName ?? ''}`.trim()
      : undefined;
    const bankCustomerId = bankConnection?.bankCustomerId ?? undefined;
    return { id: user.id, email: user.email, role: user.role, username, bankCustomerId };
  }

  async refreshToken(
    dto: RefreshTokenDto,
    req?: any,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const { ipAddress, userAgent } = req
      ? this.extractRequestInfo(req)
      : { ipAddress: null, userAgent: null };

    let payload: jwt.JwtPayload;
    try {
      payload = validateRefreshToken(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const sessionId = payload.sessionId as string;
    if (!sessionId) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    const newSession = await this.prisma.session.create({
      data: {
        userId: session.userId,
        token: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: userAgent ?? session.userAgent ?? undefined,
        ipAddress: ipAddress ?? session.ipAddress ?? undefined,
      },
    });

    const accessToken = signAccessToken({
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
    });
    const refreshToken = signRefreshToken({ sessionId: newSession.id });

    await this.prisma.session.update({
      where: { id: newSession.id },
      data: { token: refreshToken },
    });

    return { accessToken, refreshToken };
  }

  async logout(dto: RefreshTokenDto): Promise<void> {
    let payload: jwt.JwtPayload;
    try {
      payload = validateRefreshToken(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const sessionId = payload.sessionId as string;
    if (sessionId) {
      await this.prisma.session.updateMany({
        where: { id: sessionId, isRevoked: false },
        data: { isRevoked: true },
      });
    }
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
    req?: any,
  ): Promise<{ step: string; message: string; token?: string }> {
    const { ipAddress, userAgent } = req
      ? this.extractRequestInfo(req)
      : { ipAddress: null, userAgent: null };

    const user = await this.prisma.user.findUnique({
      where: { email: dto.contact },
    });
    if (!user) {
      logAuth(
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
      await this.saveOtpToDb(user.id, otp, 'RESET_PASSWORD');

      logAuth(
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
        logAuth(
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

      logAuth(
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
      logAuth(
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

  async verifySetPasswordToken(token: string) {
    const payload = validateSetPasswordToken(token);

    if (payload.type !== 'set_password' || !payload.sub) {
      throw new UnauthorizedException('Token invalide');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub as string },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    if (user.password) {
      throw new BadRequestException('Mot de passe déjà défini. Connectez-vous.');
    }

    return { valid: true, accountNumber: payload.accountNumber as string };
  }

  async setPassword(
    token: string,
    password: string,
    req?: any,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; role: string; username?: string };
  }> {
    const { ipAddress, userAgent } = req
      ? this.extractRequestInfo(req)
      : { ipAddress: null, userAgent: null };

    const payload = validateSetPasswordToken(token);

    if (payload.type !== 'set_password' || !payload.sub) {
      throw new UnauthorizedException('Token invalide');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub as string },
      include: { bankConnections: { include: { bankCustomer: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    if (user.password) {
      throw new BadRequestException('Mot de passe déjà défini. Connectez-vous.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(password) },
    });

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        token: signRefreshToken({ sessionId: 'tmp' }),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: userAgent ?? undefined,
        ipAddress: ipAddress ?? undefined,
      },
    });

    const refreshToken = signRefreshToken({ sessionId: session.id });
    await this.prisma.session.update({
      where: { id: session.id },
      data: { token: refreshToken },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
    });

    const username = user.bankConnections[0]?.bankCustomer
      ? `${user.bankConnections[0].bankCustomer.firstName} ${user.bankConnections[0].bankCustomer.lastName ?? ''}`.trim()
      : undefined;

    logAuth(
      this.prisma,
      'password_set',
      true,
      user.email,
      user.id,
      ipAddress,
      userAgent,
    );

    this.logger.log(`Mot de passe défini pour : ${user.email}`);

    return {
      accessToken: signAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
      }),
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role, username },
    };
  }

  async enableMfa(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.mfaEnabled) {
      throw new BadRequestException('Le MFA est déjà activé');
    }

    const secret = authenticator.generateSecret();
    const serviceName = 'Orabank App';
    const uri = totpClient.keyuri(user.email, serviceName, secret);

    // Stocker le secret temporairement (pas encore activé)
    await this.redis.set(`mfa_secret:${userId}`, secret, 600);

    return { secret, uri };
  }

  async verifyMfa(userId: string, code: string) {
    const secret = await this.redis.get(`mfa_secret:${userId}`);

    if (!secret) {
      throw new UnauthorizedException(
        'Session expirée. Recommencez la configuration MFA.',
      );
    }

    try {
      totpClient.verify({ token: code, secret });
    } catch {
      throw new UnauthorizedException('Code TOTP invalide');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true, mfaSecret: secret },
    });

    await this.redis.delete(`mfa_secret:${userId}`);

    this.logger.log(`MFA activé pour l'utilisateur : ${userId}`);
    return { message: 'MFA activé avec succès' };
  }

  async disableMfa(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.password) {
      throw new BadRequestException(
        'Mot de passe non défini. Impossible de désactiver le MFA.',
      );
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mot de passe invalide');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null },
    });

    this.logger.log(`MFA désactivé pour l'utilisateur : ${userId}`);
    return { message: 'MFA désactivé avec succès' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    if (!user.password) throw new BadRequestException('Mot de passe non défini');

    const isValid = await comparePassword(dto.currentPassword, user.password);
    if (!isValid) throw new BadRequestException('Mot de passe actuel incorrect');

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: await hashPassword(dto.newPassword) },
    });

    this.logger.log(`Mot de passe changé pour l'utilisateur : ${userId}`);
    return { message: 'Mot de passe modifié avec succès' };
  }

  async mfaStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      enabled: user.mfaEnabled,
      method: user.mfaEnabled ? 'TOTP' : null,
    };
  }

  validateToken(token: string): jwt.JwtPayload {
    return validateToken(token);
  }
}
