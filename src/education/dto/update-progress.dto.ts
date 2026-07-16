import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProgressDto {
  @ApiProperty({ description: 'ID de la leçon à marquer comme terminée' })
  @IsUUID()
  lessonId: string;
}
