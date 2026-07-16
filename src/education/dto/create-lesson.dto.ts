import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentBlock } from './content-block.dto';

export class CreateLessonDto {
  @ApiProperty()
  @IsUUID()
  learningPathId: string;

  @ApiProperty({ example: 'Comprendre la règle des 50/30/20' })
  @IsString()
  title: string;

  @ApiProperty({ example: '# La règle des 50/30/20\n\nLa règle...' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: 'Une méthode simple pour répartir vos revenus' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiProperty({ enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], example: 'BEGINNER' })
  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const)
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  minScore?: number;

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  maxScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  relatedProductId?: string;

  @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], example: 'DRAFT' })
  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const)
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

  @ApiPropertyOptional({ type: [ContentBlock], description: 'Blocs de contenu structuré (remplace le Markdown si présent)' })
  @IsOptional()
  @IsArray()
  contentBlocks?: ContentBlock[];
}
