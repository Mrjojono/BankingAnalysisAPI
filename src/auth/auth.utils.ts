import bcrypt from 'bcryptjs';
import otpGenerator from 'otp-generator';
import { UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';

const logger = new Logger('AuthUtils');

export interface RegisterState {
  otp: string;
  step: string;
  customerId: string;
  contact: string;
  contactType: 'email' | 'phone';
}

/**
 * Hache un mot de passe en clair avec bcrypt
 * @param password - Le mot de passe en clair à hacher
 * @returns Le mot de passe haché
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt();
  return bcrypt.hash(password, salt);
}

/**
 * Compare un mot de passe en clair avec un hash bcrypt
 * @param password - Le mot de passe en clair saisi par l'utilisateur
 * @param hashedPassword - Le hash stocké en base de données
 * @returns true si le mot de passe correspond, false sinon
 */
export async function comparePassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Génère un code OTP numérique à 6 chiffres
 * @returns Un code OTP à 6 chiffres sous forme de string
 */
export function generateOtp(): string {
  return otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });
}

/**
 * Parse et retourne l'état du flow d'inscription depuis Redis
 * @param raw - La valeur brute récupérée depuis Redis (string ou null)
 * @returns L'état parsé sous forme de RegisterState
 * @throws UnauthorizedException si la session est expirée ou introuvable
 */
export function parseState(raw: string | null): RegisterState {
  if (!raw) throw new UnauthorizedException('Session expirée. Recommencez.');
  return JSON.parse(raw) as RegisterState;
}

/**
 * Retourne la clé Redis pour l'état du flow d'inscription
 * @param accountNumber - Le numéro de compte bancaire
 * @returns La clé Redis formatée
 */
export const registerKey = (accountNumber: string) =>
  `register:${accountNumber}`;

/**
 * Retourne la clé Redis pour l'OTP du flow d'inscription
 * @param accountNumber - Le numéro de compte bancaire
 * @returns La clé Redis formatée pour l'OTP
 */
export const registerOtpKey = (accountNumber: string) =>
  `register:${accountNumber}:otp`;

/**
 * Signe un token JWT avec un payload donné
 * @param payload - Les données à inclure dans le token
 * @returns Le token JWT signé
 */
export const signToken = (payload: object): string => {
  return jwt.sign(payload, process.env.JWT_SECRET ?? '', { expiresIn: '1h' });
};

/**
 *
 * @param token
 * @returns le payload du token
 */
export const validateToken = (token: string): jwt.JwtPayload => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET ?? '') as jwt.JwtPayload;
  } catch {
    throw new UnauthorizedException('Invalid or expired token');
  }
};

/**
 * @param prisma - Service Prisma
 * @param action - Type d'action (login_attempt, otp_sent, account_created, etc)
 * @param success - Succès ou échec
 * @param email - Email (optionnel)
 * @param userId - User ID (optionnel)
 * @param ipAddress - IP du client (optionnel)
 * @param userAgent - User-Agent (optionnel)
 * @param metadata - Données additionnelles (optionnel)
 */
// auth.utils.ts

export async function logAuth(
  prisma: PrismaService,
  action: string,
  success: boolean,
  email: any,
  userId: string | null | undefined = null,
  ipAddress: any,
  userAgent: any,
  metadata: any = null,
): Promise<void> {
  try {
    await prisma.authLog.create({
      data: {
        action,
        success,
        email: email ?? null,
        userId: userId ?? null,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        metadata: metadata ?? null,
      },
    });
  } catch (error) {
    logger.error(`Erreur log auth (${action}):`, error);
  }
}
