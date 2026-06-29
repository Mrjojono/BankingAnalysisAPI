import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import {
  CreateQuestionDto,
  UpdateQuestionDto,
  UpdateChoiceDto,
  ChoiceDto,
} from './dto/create-question.dto';

@ApiTags('Admin - Quiz')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('api/admin/quiz')
export class QuizAdminController {
  constructor(private readonly quizService: QuizService) {}

  @Get()
  @ApiOperation({ summary: 'Lister tous les quiz' })
  list() {
    return this.quizService.listQuizzes();
  }

  @Post()
  @ApiOperation({ summary: 'Créer un quiz' })
  create(@Body() dto: CreateQuizDto) {
    return this.quizService.createQuiz(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'un quiz (questions + choix + liens)" })
  get(@Param('id') id: string) {
    return this.quizService.getQuiz(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un quiz' })
  update(@Param('id') id: string, @Body() dto: UpdateQuizDto) {
    return this.quizService.updateQuiz(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un quiz' })
  remove(@Param('id') id: string) {
    return this.quizService.deleteQuiz(id);
  }

  // Questions
  @Post(':id/questions')
  @ApiOperation({ summary: 'Ajouter une question au quiz' })
  addQuestion(@Param('id') id: string, @Body() dto: CreateQuestionDto) {
    return this.quizService.addQuestion(id, dto);
  }

  @Patch('questions/:qid')
  @ApiOperation({ summary: 'Modifier une question' })
  updateQuestion(@Param('qid') qid: string, @Body() dto: UpdateQuestionDto) {
    return this.quizService.updateQuestion(qid, dto);
  }

  @Delete('questions/:qid')
  @ApiOperation({ summary: 'Supprimer une question' })
  removeQuestion(@Param('qid') qid: string) {
    return this.quizService.deleteQuestion(qid);
  }

  // Choices
  @Post('questions/:qid/choices')
  @ApiOperation({ summary: 'Ajouter un choix à une question' })
  addChoice(@Param('qid') qid: string, @Body() dto: ChoiceDto) {
    return this.quizService.addChoice(qid, dto);
  }

  @Patch('choices/:cid')
  @ApiOperation({ summary: 'Modifier un choix' })
  updateChoice(@Param('cid') cid: string, @Body() dto: UpdateChoiceDto) {
    return this.quizService.updateChoice(cid, dto);
  }

  @Delete('choices/:cid')
  @ApiOperation({ summary: 'Supprimer un choix' })
  removeChoice(@Param('cid') cid: string) {
    return this.quizService.deleteChoice(cid);
  }

  // Lesson links
  @Post(':id/lessons/:lessonId')
  @ApiOperation({ summary: 'Lier un quiz à une leçon' })
  linkLesson(@Param('id') id: string, @Param('lessonId') lessonId: string) {
    return this.quizService.linkToLesson(id, lessonId);
  }

  @Delete(':id/lessons/:lessonId')
  @ApiOperation({ summary: "Délier un quiz d'une leçon" })
  unlinkLesson(@Param('id') id: string, @Param('lessonId') lessonId: string) {
    return this.quizService.unlinkFromLesson(id, lessonId);
  }
}
