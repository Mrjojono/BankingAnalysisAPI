import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SmsDebugDto {
  @ApiPropertyOptional({
    example: 'ORABANK',
    description: "Expéditeur du SMS (vide = inconnu, comportement réel de l'analyse)",
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'Virement de 50000 FCFA', description: 'Corps du SMS' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ example: '2026-07-13T12:00:00Z', description: 'Date d\'envoi (optionnelle)' })
  @IsString()
  @IsOptional()
  dateSent?: string;
}
