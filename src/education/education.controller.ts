import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserId } from '../auth/user-id.decorator';
import { EducationService } from './education.service';
import { UpdateProgressDto } from './dto/update-progress.dto';

@ApiTags('Education')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('education')
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  @Get('paths')
  @ApiOperation({ summary: 'Lister les parcours avec progression' })
  getPaths(@UserId() userId: string) {
    return this.educationService.getPaths(userId);
  }

  @Get('paths/:id')
  @ApiOperation({ summary: "Détail d'un parcours avec leçons" })
  getPathDetail(@Param('id') pathId: string, @UserId() userId: string) {
    return this.educationService.getPathDetail(pathId, userId);
  }

  @Get('lessons/:id')
  @ApiOperation({ summary: "Contenu d'une leçon" })
  getLessonDetail(@Param('id') lessonId: string, @UserId() userId: string) {
    return this.educationService.getLessonDetail(lessonId, userId);
  }

  @Patch('lessons/:id/complete')
  @ApiOperation({ summary: 'Marquer une leçon terminée' })
  completeLesson(@Param('id') lessonId: string, @UserId() userId: string) {
    return this.educationService.completeLesson(lessonId, userId);
  }

  @Patch('progress')
  @ApiOperation({ summary: 'Marquer une leçon terminée (mobile)' })
  updateProgress(
    @UserId() userId: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.educationService.completeLesson(dto.lessonId, userId);
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Leçons recommandées (matrice + score)' })
  getRecommendations(@UserId() userId: string) {
    return this.educationService.getRecommendationsForUser(userId);
  }
}
