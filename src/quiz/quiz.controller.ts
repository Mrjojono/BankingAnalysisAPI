import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserId } from '../auth/user-id.decorator';
import { QuizService } from './quiz.service';
import { QuizSubmitDto } from './dto/submit-answer.dto';

@ApiTags('Quiz')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Get('by-lesson/:lessonId')
  @ApiOperation({
    summary: "Récupérer le quiz d'une leçon (questions sans réponses)",
  })
  getByLesson(@Param('lessonId') lessonId: string, @UserId() userId: string) {
    return this.quizService.getQuizForLesson(lessonId, userId);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Démarrer une tentative de quiz' })
  start(@Param('id') id: string, @UserId() userId: string) {
    return this.quizService.startAttempt(id, userId);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Soumettre les réponses du quiz' })
  submit(
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: QuizSubmitDto,
  ) {
    return this.quizService.submitAttempt(id, userId, dto.answers);
  }

  @Get('attempts')
  @ApiOperation({ summary: 'Historique des tentatives' })
  attempts(@UserId() userId: string) {
    return this.quizService.getUserAttempts(userId);
  }

  @Get('attempts/:attemptId')
  @ApiOperation({ summary: "Détail d'une tentative" })
  attemptDetail(
    @Param('attemptId') attemptId: string,
    @UserId() userId: string,
  ) {
    return this.quizService.getAttemptDetail(attemptId, userId);
  }
}
