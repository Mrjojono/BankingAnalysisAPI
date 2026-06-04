import {
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  IsString,
  IsIn,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Date de début (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Date de fin (YYYY-MM-DD)',
    example: '2024-06-30',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Année de référence pour l’analyse',
    example: 2024,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @ApiPropertyOptional({
    description: 'Mois de référence pour l’analyse',
    example: 6,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}

export class RevenueVariationQueryDto {
  @ApiPropertyOptional({
    description: 'Date de début (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Date de fin (YYYY-MM-DD)',
    example: '2024-06-30',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Nombre de mois à analyser',
    default: 6,
    example: 6,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  months?: number;

  @ApiPropertyOptional({
    description: "Année de référence pour l'analyse",
    example: 2024,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @ApiPropertyOptional({
    description: "Mois de référence pour l'analyse",
    example: 6,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}

export class ClassifierFeedbackDto {
  @ApiProperty({
    description: 'ID du client',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @ApiProperty({
    description: 'Description de la transaction',
    example: 'VIR SALAIRE MARS 2024',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Catégorie correcte',
    enum: [
      'LOGEMENT',
      'ALIMENTATION',
      'TRANSPORT',
      'SANTE',
      'MOBILE_MONEY',
      'CARBURANT',
      'COMMERCE',
      'FRAIS_BANCAIRES',
      'VIREMENTS',
      'RETRAITS',
      'DEPOTS',
      'INTERETS',
      'CREDIT',
      'SALAIRE',
      'DIVERS',
    ],
    example: 'SALAIRE',
  })
  @IsNotEmpty()
  @IsString()
  @IsIn([
    'LOGEMENT',
    'ALIMENTATION',
    'TRANSPORT',
    'SANTE',
    'MOBILE_MONEY',
    'CARBURANT',
    'COMMERCE',
    'FRAIS_BANCAIRES',
    'VIREMENTS',
    'RETRAITS',
    'DEPOTS',
    'INTERETS',
    'CREDIT',
    'SALAIRE',
    'DIVERS',
  ])
  correctCategory: string;
}
