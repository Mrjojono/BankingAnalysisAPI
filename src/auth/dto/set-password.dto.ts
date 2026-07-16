import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';

export class SetPasswordDto {
  @ApiProperty({ description: 'Token JWT reçu par email' })
  @IsString()
  @IsNotEmpty()
  readonly token: string;

  @ApiProperty({
    example: 'Motdepasse123!',
    description: 'Mot de passe (min 8 caractères, 1 majuscule, 1 chiffre, 1 spécial)',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/, {
    message: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial',
  })
  readonly password: string;
}
