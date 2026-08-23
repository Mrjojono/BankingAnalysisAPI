import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class BroadcastDto {
  @ApiProperty({ description: 'Titre de la notification' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Corps du message' })
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiPropertyOptional({ default: 'ADMIN_BROADCAST' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ default: 'INFO' })
  @IsString()
  @IsOptional()
  severity?: string;

  @ApiPropertyOptional({ description: "Cible : 'all' ou tableau de userIds" })
  @IsOptional()
  target?: string | string[];

  @ApiPropertyOptional({ description: "IDs ou emails des BankCustomer ciblés" })
  @IsOptional()
  @IsArray()
  customerTargets?: string[];
}
