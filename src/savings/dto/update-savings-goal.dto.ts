import { IsString, IsNumber, IsDateString, IsOptional, Min, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSavingsGoalDto {
  @ApiPropertyOptional({ example: 'Voyage à Dakar' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Voyage à Dakar' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ example: 500000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  targetAmount?: number;

  @ApiPropertyOptional({ example: 100000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  savedAmount?: number;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'COMPLETED', 'CANCELLED'] as const)
  status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}
