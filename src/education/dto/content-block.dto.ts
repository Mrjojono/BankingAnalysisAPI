import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type ContentBlockType = 'header' | 'text' | 'callout' | 'list' | 'image' | 'divider' | 'miniQuiz';

export class ContentBlock {
  @ApiProperty({ enum: ['header', 'text', 'callout', 'list', 'image', 'divider', 'miniQuiz'] })
  type: ContentBlockType;

  @ApiPropertyOptional()
  text?: string;

  @ApiPropertyOptional()
  level?: number;

  @ApiPropertyOptional()
  variant?: string;

  @ApiPropertyOptional()
  items?: string[];

  @ApiPropertyOptional()
  ordered?: boolean;

  @ApiPropertyOptional()
  url?: string;

  @ApiPropertyOptional()
  alt?: string;

  @ApiPropertyOptional()
  caption?: string;

  @ApiPropertyOptional()
  question?: string;

  @ApiPropertyOptional()
  choices?: string[];

  @ApiPropertyOptional()
  correctIndex?: number;

  @ApiPropertyOptional()
  explanation?: string;
}
