import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'monAncienMot2Passe', description: 'Mot de passe actuel' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'monNouveauMot2Passe', description: 'Nouveau mot de passe (min. 8 caractères)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
