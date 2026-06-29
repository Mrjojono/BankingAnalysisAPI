import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  Matches,
  IsIn,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: '4443185208',
    description: 'Numéro de compte bancaire',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{10}$/, { message: 'Numéro de compte invalide' })
  readonly accountNumber: string;

  @ApiPropertyOptional({
    example: 'joan@gmail.com ou +22891000000',
    description: 'Email ou téléphone pour recevoir le code OTP',
  })
  @IsString()
  @IsOptional()
  readonly contact?: string;

  @ApiPropertyOptional({
    example: 'email',
    description: 'Type de contact : email ou phone',
  })
  @IsString()
  @IsOptional()
  @IsIn(['email', 'phone'])
  readonly contactType?: 'email' | 'phone';

  @ApiPropertyOptional({
    example: '847291',
    description: 'Code OTP à 6 chiffres',
  })
  @IsString()
  @IsOptional()
  readonly otp?: string;

  @ApiPropertyOptional({
    example: 'Motdepasse123!',
    description:
      'Mot de passe (min 8 caractères, 1 majuscule, 1 chiffre, 1 spécial)',
    minLength: 8,
  })
  @IsString()
  @IsOptional()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/, {
    message:
      'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial',
  })
  readonly password?: string;
}
