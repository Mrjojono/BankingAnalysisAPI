import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LessonProgressDto {
  @ApiProperty()
  completed: boolean;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiProperty()
  viewedAt: Date;
}

export class LessonWithProgressDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  learningPathId: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  summary?: string;

  @ApiPropertyOptional()
  imageUrl?: string;

  @ApiProperty()
  difficulty: string;

  @ApiProperty()
  order: number;

  @ApiPropertyOptional()
  estimatedMinutes?: number;

  @ApiPropertyOptional()
  minScore?: number;

  @ApiPropertyOptional()
  maxScore?: number;

  @ApiPropertyOptional({ type: LessonProgressDto })
  progress?: LessonProgressDto;
}

export class PathWithProgressDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  icon?: string;

  @ApiProperty()
  difficulty: string;

  @ApiProperty()
  order: number;

  @ApiPropertyOptional()
  totalLessons?: number;

  @ApiPropertyOptional()
  completedLessons?: number;

  @ApiPropertyOptional()
  isCompleted?: boolean;

  @ApiPropertyOptional({ type: [LessonWithProgressDto] })
  lessons?: LessonWithProgressDto[];
}

export class LessonDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  learningPathId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiPropertyOptional()
  summary?: string;

  @ApiPropertyOptional()
  imageUrl?: string;

  @ApiPropertyOptional()
  videoUrl?: string;

  @ApiProperty()
  difficulty: string;

  @ApiProperty()
  order: number;

  @ApiPropertyOptional()
  estimatedMinutes?: number;

  @ApiProperty({ type: LessonProgressDto })
  progress: LessonProgressDto;
}

export class RecommendationDto {
  @ApiProperty()
  lessonId: string;

  @ApiProperty()
  lessonTitle: string;

  @ApiProperty()
  pathTitle: string;

  @ApiProperty()
  reason: string;

  @ApiProperty()
  score: number;
}
