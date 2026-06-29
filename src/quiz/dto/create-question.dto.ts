import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChoiceDto {
  @ApiProperty({ example: '50/30/20' })
  @IsString()
  text: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isCorrect: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class CreateQuestionDto {
  @ApiProperty({ example: "Qu'est-ce que la règle 50/30/20 ?" })
  @IsString()
  question: string;

  @ApiPropertyOptional({ enum: ['MCQ', 'TRUE_FALSE'], default: 'MCQ' })
  @IsOptional()
  @IsEnum(['MCQ', 'TRUE_FALSE'] as const)
  type?: 'MCQ' | 'TRUE_FALSE';

  @ApiPropertyOptional({ example: 'budget', description: 'Catégorie de la question (ex: budget, epargne, credit)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    example: 'Cette règle répartit les revenus en 3 catégories',
  })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiProperty({ type: [ChoiceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChoiceDto)
  choices: ChoiceDto[];
}

export class UpdateQuestionDto {
  @ApiPropertyOptional({ example: "Qu'est-ce que la règle 50/30/20 ?" })
  @IsOptional()
  @IsString()
  question?: string;

  @ApiPropertyOptional({ enum: ['MCQ', 'TRUE_FALSE'] })
  @IsOptional()
  @IsEnum(['MCQ', 'TRUE_FALSE'] as const)
  type?: 'MCQ' | 'TRUE_FALSE';

  @ApiPropertyOptional({ example: 'budget', description: 'Catégorie de la question' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateChoiceDto {
  @ApiPropertyOptional({ example: '50/30/20' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
