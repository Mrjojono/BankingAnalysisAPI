import { ApiProperty } from '@nestjs/swagger';

export class UserStatsResponseDto {
  @ApiProperty({
    description: 'Total des dépôts en francs CFA',
    example: 125000,
  })
  deposits: number;

  @ApiProperty({
    description: 'Total des prêts en francs CFA',
    example: 0,
  })
  loans: number;

  @ApiProperty({
    description: 'Total des économies en francs CFA',
    example: 45000,
  })
  savings: number;

  @ApiProperty({
    description: 'Score de risque de crédit de l\'utilisateur (0-100)',
    example: 72,
  })
  score: number;
}
