import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserId } from '../auth/user-id.decorator';
import { EducationService } from './education.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Education')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('education')
export class EducationController {
  constructor(
    private readonly educationService: EducationService,
    private readonly prisma: PrismaService,
  ) {}

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
  @ApiOperation({ summary: 'Mettre à jour la progression (mobile)' })
  async updateProgress(
    @UserId() userId: string,
    @Body() body: { pathId: string; lessonId: string; status: string },
  ) {
    return this.educationService.completeLesson(body.lessonId, userId);
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Leçons recommandées (matrice + score)' })
  async getRecommendations(@UserId() userId: string) {
    const connection = await this.prisma.userBankConnection.findFirst({
      where: { userId },
    });
    const customerId = connection?.bankCustomerId;
    if (!customerId) return [];
    return this.educationService.getRecommendations(userId, customerId);
  }
}
