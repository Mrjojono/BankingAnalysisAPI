import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  Length,
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
    description: 'Code OTP (optionnel)',
    example: '1234',
  })
  @IsString()
  @IsOptional()
  @Length(6, 6)
  otp?: string;

  @ApiPropertyOptional({
    description: 'Nouveau mot de passe (optionnel)',
    example: 'password123',
  })
  @IsString()
  @IsOptional()
  @MinLength(8)
  newPassword?: string;
}
