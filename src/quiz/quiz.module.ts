import { Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { QuizAdminController } from './quiz-admin.controller';
import { QuizService } from './quiz.service';
import { PrismaService } from '../prisma/prisma.service';
import { EducationModule } from '../education/education.module';

@Module({
  imports: [EducationModule],
  controllers: [QuizController, QuizAdminController],
  providers: [QuizService, PrismaService],
  exports: [QuizService],
})
export class QuizModule {}
