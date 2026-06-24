import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsArray, IsString } from 'class-validator';

export class UpdatePrefsDto {
  @ApiPropertyOptional({ description: 'Activer les notifications push' })
  @IsBoolean()
  @IsOptional()
  push?: boolean;

  @ApiPropertyOptional({ description: 'Activer les notifications email' })
  @IsBoolean()
  @IsOptional()
  email?: boolean;

  @ApiPropertyOptional({
    description: 'Types autorisés (null = tous)',
    example: ['ADVICE', 'SCORE_CHANGE'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  types?: string[];
}
