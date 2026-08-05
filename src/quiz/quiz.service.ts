import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EducationService } from '../education/education.service';

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly educationService: EducationService,
  ) {}

  // ========== Admin: Quiz CRUD ==========

  async listQuizzes() {
    return this.prisma.quiz.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { questions: true, lessonLinks: true } },
      },
    });
  }

  async getQuiz(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { choices: { orderBy: { order: 'asc' } } },
        },
        lessonLinks: {
          include: { lesson: { select: { id: true, title: true } } },
        },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz introuvable');
    return quiz;
  }

  async createQuiz(data: {
    title: string;
    description?: string;
    status?: string;
    passingScore?: number;
  }) {
    return this.prisma.quiz.create({
      data: {
        title: data.title,
        description: data.description,
        status: (data.status ?? 'DRAFT') as any,
        passingScore: data.passingScore ?? 70,
      },
    });
  }

  async updateQuiz(
    id: string,
    data: Partial<{
      title: string;
      description?: string;
      status: string;
      passingScore: number;
    }>,
  ) {
    await this.getQuiz(id);
    return this.prisma.quiz.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.status !== undefined && { status: data.status as any }),
        ...(data.passingScore !== undefined && {
          passingScore: data.passingScore,
        }),
      },
    });
  }

  async deleteQuiz(id: string) {
    await this.getQuiz(id);
    await this.prisma.quiz.delete({ where: { id } });
  }

  // ========== Admin: Questions ==========

  async addQuestion(
    quizId: string,
    data: {
      question: string;
      type?: string;
      explanation?: string;
      order?: number;
      choices: { text: string; isCorrect: boolean; order?: number }[];
    },
  ) {
    await this.getQuiz(quizId);
    const correctCount = data.choices.filter((c) => c.isCorrect).length;
    if (correctCount !== 1)
      throw new BadRequestException('Une seule réponse correcte par question');
    if (data.choices.length < 2)
      throw new BadRequestException('Au moins 2 choix requis');
    return this.prisma.quizQuestion.create({
      data: {
        quizId,
        question: data.question,
        type: (data.type ?? 'MCQ') as any,
        explanation: data.explanation,
        order: data.order ?? 0,
        choices: {
          create: data.choices.map((c, i) => ({
            text: c.text,
            isCorrect: c.isCorrect,
            order: c.order ?? i,
          })),
        },
      },
      include: { choices: { orderBy: { order: 'asc' } } },
    });
  }

  async updateQuestion(
    questionId: string,
    data: {
      question?: string;
      type?: string;
      explanation?: string;
      order?: number;
    },
  ) {
    const q = await this.prisma.quizQuestion.findUnique({
      where: { id: questionId },
    });
    if (!q) throw new NotFoundException('Question introuvable');
    return this.prisma.quizQuestion.update({
      where: { id: questionId },
      data: {
        ...(data.question !== undefined && { question: data.question }),
        ...(data.type !== undefined && { type: data.type as any }),
        ...(data.explanation !== undefined && {
          explanation: data.explanation,
        }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  async deleteQuestion(questionId: string) {
    const q = await this.prisma.quizQuestion.findUnique({
      where: { id: questionId },
    });
    if (!q) throw new NotFoundException('Question introuvable');
    await this.prisma.quizQuestion.delete({ where: { id: questionId } });
  }

  async addChoice(
    questionId: string,
    data: { text: string; isCorrect: boolean; order?: number },
  ) {
    const q = await this.prisma.quizQuestion.findUnique({
      where: { id: questionId },
      include: { choices: true },
    });
    if (!q) throw new NotFoundException('Question introuvable');
    if (data.isCorrect && q.choices.some((c) => c.isCorrect)) {
      throw new BadRequestException(
        'Cette question a déjà une réponse correcte',
      );
    }
    return this.prisma.quizChoice.create({
      data: {
        questionId,
        text: data.text,
        isCorrect: data.isCorrect,
        order: data.order ?? q.choices.length,
      },
    });
  }

  async updateChoice(
    choiceId: string,
    data: { text?: string; isCorrect?: boolean; order?: number },
  ) {
    const c = await this.prisma.quizChoice.findUnique({
      where: { id: choiceId },
    });
    if (!c) throw new NotFoundException('Choix introuvable');
    if (data.isCorrect === true) {
      const question = await this.prisma.quizQuestion.findUnique({
        where: { id: c.questionId },
        include: { choices: true },
      });
      const otherCorrect = question?.choices.find(
        (ch) => ch.isCorrect && ch.id !== choiceId,
      );
      if (otherCorrect) {
        await this.prisma.quizChoice.update({
          where: { id: otherCorrect.id },
          data: { isCorrect: false },
        });
      }
    }
    return this.prisma.quizChoice.update({
      where: { id: choiceId },
      data: {
        ...(data.text !== undefined && { text: data.text }),
        ...(data.isCorrect !== undefined && { isCorrect: data.isCorrect }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  async deleteChoice(choiceId: string) {
    const c = await this.prisma.quizChoice.findUnique({
      where: { id: choiceId },
    });
    if (!c) throw new NotFoundException('Choix introuvable');
    await this.prisma.quizChoice.delete({ where: { id: choiceId } });
  }

  // ========== Admin: Lesson Links ==========

  async linkToLesson(quizId: string, lessonId: string) {
    await this.getQuiz(quizId);
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Leçon introuvable');
    const existing = await this.prisma.quizLessonLink.findUnique({
      where: { quizId_lessonId: { quizId, lessonId } },
    });
    if (existing) return existing;
    return this.prisma.quizLessonLink.create({ data: { quizId, lessonId } });
  }

  async unlinkFromLesson(quizId: string, lessonId: string) {
    const link = await this.prisma.quizLessonLink.findUnique({
      where: { quizId_lessonId: { quizId, lessonId } },
    });
    if (!link) throw new NotFoundException('Lien introuvable');
    await this.prisma.quizLessonLink.delete({ where: { id: link.id } });
  }

  // ========== User: Quiz Taking ==========

  async getQuizForLesson(lessonId: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        quizLinks: {
          where: { quiz: { status: 'PUBLISHED' } },
          include: {
            quiz: {
              include: {
                questions: {
                  orderBy: { order: 'asc' },
                  include: {
                    choices: {
                      orderBy: { order: 'asc' },
                      select: { id: true, text: true, order: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!lesson) throw new NotFoundException('Leçon introuvable');
    const quiz = lesson.quizLinks[0]?.quiz;
    if (!quiz) throw new NotFoundException('Aucun quiz lié à cette leçon');
    const attempt = await this.prisma.quizAttempt.findFirst({
      where: { userId, quizId: quiz.id },
      orderBy: { startedAt: 'desc' },
    });
    return { quiz, lastAttempt: attempt };
  }

  async startAttempt(quizId: string, userId: string) {
    await this.getQuiz(quizId);
    const quizStatus = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      select: { status: true },
    });
    if (!quizStatus || quizStatus.status !== 'PUBLISHED') {
      throw new NotFoundException('Quiz introuvable');
    }
    await this.prisma.quizAttempt.updateMany({
      where: { userId, quizId, completedAt: null },
      data: { completedAt: new Date(), passed: false },
    });
    return this.prisma.quizAttempt.create({
      data: { userId, quizId, score: 0, total: 0, passed: false },
    });
  }

  async submitAttempt(
    quizId: string,
    userId: string,
    answers: { questionId: string; choiceId: string }[] | number[],
  ) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId, status: 'PUBLISHED' },
      include: {
        questions: {
          include: { choices: true },
        },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz introuvable');

    const attempt = await this.prisma.quizAttempt.findFirst({
      where: { userId, quizId, completedAt: null },
      orderBy: { startedAt: 'desc' },
    });
    if (!attempt) throw new NotFoundException('Aucune tentative en cours');

    let resolvedAnswers: { questionId: string; choiceId: string }[];
    if (answers.length > 0 && typeof answers[0] === 'number') {
      const indices = answers as number[];
      const orderedQuestions = [...quiz.questions].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );
      resolvedAnswers = indices
        .map((choiceIndex, qi) => {
          const question = orderedQuestions[qi];
          if (!question) return null;
          const orderedChoices = [...question.choices].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0),
          );
          const choice = orderedChoices[choiceIndex];
          if (!choice) return null;
          return { questionId: question.id, choiceId: choice.id };
        })
        .filter(Boolean) as { questionId: string; choiceId: string }[];
    } else {
      resolvedAnswers = answers as { questionId: string; choiceId: string }[];
    }

    let score = 0;
    const total = quiz.questions.length;
    const answerRecords: {
      questionId: string;
      choiceId: string;
      isCorrect: boolean;
    }[] = [];

    for (const a of resolvedAnswers) {
      const question = quiz.questions.find((q) => q.id === a.questionId);
      if (!question) continue;
      const choice = question.choices.find((c) => c.id === a.choiceId);
      if (!choice) continue;
      const isCorrect = choice.isCorrect;
      if (isCorrect) score++;
      answerRecords.push({
        questionId: a.questionId,
        choiceId: a.choiceId,
        isCorrect,
      });
    }

    const passed = total > 0 && (score / total) * 100 >= quiz.passingScore;

    await this.prisma.$transaction(async (tx: any) => {
      await tx.quizAttempt.update({
        where: { id: attempt.id },
        data: { score, total, passed, completedAt: new Date() },
      });
      for (const rec of answerRecords) {
        await tx.quizAnswer.create({
          data: {
            attemptId: attempt.id,
            questionId: rec.questionId,
            choiceId: rec.choiceId,
            isCorrect: rec.isCorrect,
          },
        });
      }
    });

    const lessonLinks = await this.prisma.quizLessonLink.findMany({
      where: { quizId },
    });
    if (passed && lessonLinks.length > 0) {
      for (const link of lessonLinks) {
        await this.educationService.completeLesson(link.lessonId, userId);
      }
    }

    const categoriesMap: Record<string, { score: number; total: number }> = {};
    for (const question of quiz.questions) {
      const cat = question.category || 'general';
      if (!categoriesMap[cat]) categoriesMap[cat] = { score: 0, total: 0 };
      categoriesMap[cat].total++;
    }
    for (const rec of answerRecords) {
      const question = quiz.questions.find((q) => q.id === rec.questionId);
      if (!question) continue;
      const cat = question.category || 'general';
      if (rec.isCorrect) categoriesMap[cat].score++;
    }
    const categories = Object.entries(categoriesMap).map(([name, data]) => ({
      name,
      score: data.score,
      total: data.total,
      percent: data.total > 0 ? Math.round((data.score / data.total) * 100) : 0,
    }));

    return this.prisma.quizAttempt
      .findUnique({
        where: { id: attempt.id },
        include: {
          answers: {
            include: {
              question: {
                select: { id: true, question: true, explanation: true },
              },
              choice: { select: { id: true, text: true, isCorrect: true } },
            },
          },
        },
      })
      .then((result) => ({ ...result, categories }));
  }

  async getUserAttempts(userId: string) {
    return this.prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      include: {
        quiz: { select: { id: true, title: true } },
        _count: { select: { answers: true } },
      },
    });
  }

  async getAttemptDetail(attemptId: string, userId: string) {
    const attempt = await this.prisma.quizAttempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        answers: {
          include: {
            question: {
              select: { id: true, question: true, explanation: true },
            },
            choice: { select: { id: true, text: true, isCorrect: true } },
          },
        },
      },
    });
    if (!attempt) throw new NotFoundException('Tentative introuvable');
    return attempt;
  }

  // ========== Matrix Engine Integration ==========

  async getUserCompletionRate(userId: string): Promise<number> {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { userId, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });
    if (attempts.length === 0) return 0;
    const totalScore = attempts.reduce((sum, a) => sum + a.score, 0);
    const totalMax = attempts.reduce((sum, a) => sum + a.total, 0);
    if (totalMax === 0) return 0;
    return Math.round((totalScore / totalMax) * 100) / 100;
  }
}
