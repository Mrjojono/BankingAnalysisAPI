import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateSmsPipelineDto {
  @ApiPropertyOptional({ example: true, description: 'Activer la logique de pattern/direction du regex' })
  @IsOptional()
  @IsBoolean()
  regexEnabled?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Activer l\'arbitrage CamenBert sur chaque SMS' })
  @IsOptional()
  @IsBoolean()
  camenbertEnabled?: boolean;

  @ApiPropertyOptional({ example: 0.75, description: 'Seuil de confiance CamenBert (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  camenbertThreshold?: number;
}
