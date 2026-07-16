import { Controller, Post, Get, Body, Req, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import {
  AuthResponseDto,
  LoginResponseDto,
  RefreshTokenDto,
  RefreshResponseDto,
  MeResponseDto,
  MessageResponseDto,
} from './dto/auth-response.dto';
import {
  EnableMfaResponseDto,
  VerifyMfaDto,
  DisableMfaDto,
  MfaLoginDto,
  MfaStatusResponseDto,
} from './dto/mfa.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { User } from './user.decorator';

import type { Request } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: "Inscription d'un nouvel utilisateur (flux en 3 étapes + lien magique)",
    description:
      'Flux multi-étapes : 1. Vérification du compte bancaire → 2. Envoi OTP → 3. Validation OTP + envoi lien magique. ' +
      "Le mot de passe est défini ultérieurement via le lien reçu par email (POST /auth/set-password).",
  })
  @ApiResponse({
    status: 200,
    description: 'Étape réussie (retourne step et message) — étapes: verify_contact, verify_otp, link_sent',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides ou compte déjà existant',
  })
  @ApiResponse({
    status: 401,
    description: 'Session expirée, OTP invalide ou compte introuvable',
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: "Connexion d'un utilisateur" })
  @ApiResponse({
    status: 200,
    description:
      'Connexion réussie, retourne accessToken + refreshToken + user',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    return this.authService.login(loginDto, req);
  }

  @Post('login/mfa')
  @ApiOperation({ summary: "Seconde étape MFA d'authentification" })
  @ApiResponse({
    status: 200,
    description: 'MFA validé, retourne les tokens',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Code MFA invalide' })
  async loginMfa(@Body() dto: MfaLoginDto, @Req() req: Request) {
    return this.authService.loginMfa(dto, req);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Récupérer l'utilisateur connecté" })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur trouvé',
    type: MeResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Token invalide ou expiré' })
  async me(@User() user: any) {
    return this.authService.me(user.id as string);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rafraîchir le token accès' })
  @ApiResponse({
    status: 200,
    description: 'Nouveaux tokens générés',
    type: RefreshResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Refresh token invalide ou expiré' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refreshToken(dto, req);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Déconnexion (révoque la session)' })
  @ApiResponse({ status: 200, description: 'Déconnexion réussie' })
  @ApiResponse({ status: 401, description: 'Refresh token invalide' })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto);
    return { message: 'Déconnecté avec succès' };
  }

  @Post('resend-otp')
  @ApiOperation({ summary: 'Ré-envoyer le code OTP' })
  @ApiResponse({
    status: 200,
    description: 'Code OTP ré-envoyé',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Session expirée ou OTP déjà actif',
  })
  async resendOtp(@Body() registerDto: RegisterDto) {
    return this.authService.resendOtp(registerDto.accountNumber);
  }

  @Get('verify-set-password-token')
  @ApiOperation({ summary: 'Vérifier la validité du token de création de mot de passe (magic link)' })
  @ApiResponse({ status: 200, description: 'Token valide' })
  @ApiResponse({ status: 401, description: 'Token invalide ou expiré' })
  async verifySetPasswordToken(@Query('token') token: string) {
    return this.authService.verifySetPasswordToken(token);
  }

  @Post('set-password')
  @ApiOperation({ summary: 'Définir le mot de passe via le lien magique reçu par email' })
  @ApiResponse({ status: 200, description: 'Mot de passe créé, retourne les tokens', type: LoginResponseDto })
  @ApiResponse({ status: 400, description: 'Mot de passe déjà défini ou trop court' })
  @ApiResponse({ status: 401, description: 'Token invalide ou expiré' })
  async setPassword(@Body() dto: SetPasswordDto, @Req() req: Request) {
    return this.authService.setPassword(dto.token, dto.password, req);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Réinitialisation de mot de passe (flux en 3 étapes)',
    description:
      'Flux multi-étapes : 1. Envoi OTP → 2. Validation OTP → 3. Réinitialisation du mot de passe. ' +
      "Chaque appel avance d'une étape en fonction des champs fournis.",
  })
  @ApiResponse({
    status: 200,
    description: 'Étape réussie (retourne step et message, ou token à la fin)',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'OTP expiré, invalide ou étape incorrecte',
  })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Req() req: Request,
  ) {
    return this.authService.forgotPassword(forgotPasswordDto, req);
  }

  @Post('mfa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Générer un secret TOTP pour activer le MFA' })
  @ApiResponse({
    status: 200,
    description: 'Secret TOTP généré',
    type: EnableMfaResponseDto,
  })
  async enableMfa(@User() user: any) {
    return this.authService.enableMfa(user.id);
  }

  @Post('mfa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vérifier et activer le MFA avec un code TOTP' })
  @ApiResponse({
    status: 200,
    description: 'MFA activé avec succès',
  })
  @ApiResponse({ status: 401, description: 'Code TOTP invalide' })
  async verifyMfa(@User() user: any, @Body() dto: VerifyMfaDto) {
    return this.authService.verifyMfa(user.id, dto.code);
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Désactiver le MFA (mot de passe requis)' })
  @ApiResponse({ status: 200, description: 'MFA désactivé' })
  @ApiResponse({ status: 401, description: 'Mot de passe invalide' })
  async disableMfa(@User() user: any, @Body() dto: DisableMfaDto) {
    return this.authService.disableMfa(user.id, dto.password);
  }

  @Get('mfa/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vérifier le statut du MFA' })
  @ApiResponse({
    status: 200,
    description: 'Statut MFA',
    type: MfaStatusResponseDto,
  })
  async mfaStatus(@User() user: any) {
    return this.authService.mfaStatus(user.id);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Changer le mot de passe' })
  @ApiResponse({ status: 200, description: 'Mot de passe modifié avec succès' })
  @ApiResponse({ status: 400, description: 'Mot de passe actuel incorrect ou nouveau trop court' })
  async changePassword(@User() user: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto);
  }
}
