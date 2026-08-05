import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsIn,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EvaluateEligibilityDto {
  @ApiProperty({
    description: 'ID du client bancaire (UUID)',
    example: '3dc5213d-c382-4028-9d09-9472934b791c',
  })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({
    description: 'Code du produit à évaluer',
    example: 'COMPTES_PART',
  })
  @IsString()
  @IsNotEmpty()
  productCode: string;

  @ApiPropertyOptional({
    description:
      "Valeurs métier fournies par l'utilisateur (les métriques analytics sont calculées automatiquement)",
    example: { dat_montant_min: 10000000, dat_duree_min_mois: 12 },
  })
  @IsObject()
  @IsOptional()
  inputs?: Record<string, number | boolean | string>;

  @ApiPropertyOptional({
    description:
      "Mode d'évaluation : matrix (défaut) ou rules (moteur règles classique)",
    example: 'matrix',
    default: 'matrix',
  })
  @IsString()
  @IsOptional()
  @IsIn(['matrix', 'rules'])
  mode?: 'matrix' | 'rules' = 'matrix';
}

export class SimulateEligibilityDto {
  @ApiProperty({ description: 'ID du client bancaire (UUID)' })
  @IsString() @IsNotEmpty()
  customerId: string;

  @ApiProperty({ description: 'Code du produit à simuler' })
  @IsString() @IsNotEmpty()
  productCode: string;

  @ApiProperty({ description: 'Ajustements à appliquer aux métriques (champ -> valeur absolue)', example: { monthlyIncome: 800000, debtRatio: 15 } })
  @IsObject()
  adjustments: Record<string, number>;

  @ApiPropertyOptional({ description: "Mode d'évaluation", default: 'matrix' })
  @IsString() @IsOptional() @IsIn(['matrix', 'rules'])
  mode?: 'matrix' | 'rules' = 'matrix';
}
