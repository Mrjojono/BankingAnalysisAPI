import { IsString, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSavingsGoalDto {
  @ApiProperty({ example: 'Voyage à Dakar' })
  @IsString()
  name: string;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(1)
  targetAmount: number;

  @ApiProperty({ example: '2026-12-31T00:00:00Z' })
  @IsDateString()
  targetDate: string;
}
