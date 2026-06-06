import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
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
}
