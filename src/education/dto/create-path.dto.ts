import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePathDto {
  @ApiProperty({ example: 'Gestion de Budget' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Apprenez à gérer votre budget quotidien' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'BookOpen' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({
    enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
    example: 'BEGINNER',
  })
  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const)
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
