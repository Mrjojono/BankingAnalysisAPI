import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class EnableMfaResponseDto {
  @ApiProperty({ description: 'Secret TOTP (à sauvegarder)' })
  secret: string;

  @ApiProperty({ description: 'URI de provisionnement (QR code)' })
  uri: string;
}

export class VerifyMfaDto {
  @ApiProperty({ description: 'Code TOTP à 6 chiffres', example: '123456' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class DisableMfaDto {
  @ApiProperty({ description: 'Mot de passe actuel pour confirmation' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class MfaLoginDto {
  @ApiProperty({
    description: 'Token MFA temporaire reçu après le login initial',
  })
  @IsString()
  @IsNotEmpty()
  mfaToken: string;

  @ApiProperty({ description: 'Code TOTP à 6 chiffres', example: '123456' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class MfaStatusResponseDto {
  @ApiProperty({ description: 'MFA activé ou non' })
  enabled: boolean;

  @ApiPropertyOptional({ description: 'Type de MFA (TOTP ou EMAIL)' })
  method?: string;
}

export class VerifyEmailMfaDto {
  @ApiProperty({ description: 'Code OTP reçu par email', example: '123456' })
  @IsString()
  @IsNotEmpty()
  code: string;
}
