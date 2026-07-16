import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsObject } from 'class-validator';

export class UpdatePrefsDto {
  @ApiPropertyOptional({ description: 'Activer les notifications push' })
  @IsBoolean()
  @IsOptional()
  pushEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Types de notification (map clé -> booléen)',
    example: { SCORE_CHANGE: true, ADVICE: false },
  })
  @IsObject()
  @IsOptional()
  types?: Record<string, boolean>;
}
