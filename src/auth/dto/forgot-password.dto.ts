import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  Length,
  Matches,
} from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Contact (email ou numéro de téléphone)',
    example: 'joan@gmail.com',
  })
  @IsString()
  @IsNotEmpty()
  contact: string;

  @ApiPropertyOptional({
    description: 'Code OTP à 6 chiffres (optionnel)',
    example: '847291',
  })
  @IsString()
  @IsOptional()
  @Length(6, 6)
  otp?: string;

  @ApiPropertyOptional({
    description:
      'Nouveau mot de passe (min 8 caractères, 1 majuscule, 1 chiffre, 1 spécial)',
    example: 'Motdepasse123!',
  })
  @IsString()
  @IsOptional()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/, {
    message:
      'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial',
  })
  newPassword?: string;
}
