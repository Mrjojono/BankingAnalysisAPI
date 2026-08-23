import { IsUUID, IsString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdviceLinkDto {
  @ApiProperty()
  @IsUUID()
  lessonId: string;

  @ApiProperty({ example: 'SAVINGS_LOW' })
  @IsString()
  adviceType: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}
