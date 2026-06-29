import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OverviewService } from '../analytics/overview/overview.service';
import { ScoreEngine } from '../analytics/engines/score.engine';
import { EducationMatrixEngine } from './matrix/education-matrix.engine';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePathDto } from './dto/create-path.dto';
import { UpdatePathDto } from './dto/update-path.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { CreateAdviceLinkDto } from './dto/create-advice-link.dto';

@Injectable()
export class EducationService {
  private readonly logger = new Logger(EducationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly overviewService: OverviewService,
    private readonly scoreEngine: ScoreEngine,
    private readonly matrixEngine: EducationMatrixEngine,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ========== User-facing ==========

  async getPaths(userId: string) {
    const paths = await this.prisma.learningPath.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        lessons: {
          where: { status: 'PUBLISHED' },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            summary: true,
            imageUrl: true,
            difficulty: true,
            order: true,
            estimatedMinutes: true,
            minScore: true,
            maxScore: true,
          },
        },
        progress: {
          where: { userId },
          select: {
            lessonsCompleted: true,
            completedAt: true,
          },
        },
      },
    });

    return paths.map((path) => ({
      id: path.id,
      title: path.title,
      description: path.description,
      icon: path.icon,
      difficulty: path.difficulty,
      order: path.order,
      totalLessons: path.lessons.length,
      completedLessons: path.progress[0]?.lessonsCompleted ?? 0,
      isCompleted: !!path.progress[0]?.completedAt,
      lessons: path.lessons,
    }));
  }

  async getPathDetail(pathId: string, userId: string) {
    const path = await this.prisma.learningPath.findUnique({
      where: { id: pathId },
      include: {
        lessons: {
          where: { status: 'PUBLISHED' },
          orderBy: { order: 'asc' },
          include: {
            progress: {
              where: { userId },
              select: { completed: true, completedAt: true, viewedAt: true },
            },
          },
        },
        progress: {
          where: { userId },
          select: { lessonsCompleted: true, completedAt: true },
        },
      },
    });

    if (!path) throw new NotFoundException('Parcours introuvable');

    return {
      id: path.id,
      title: path.title,
      description: path.description,
      icon: path.icon,
      difficulty: path.difficulty,
      order: path.order,
      totalLessons: path.lessons.length,
      completedLessons: path.progress[0]?.lessonsCompleted ?? 0,
      isCompleted: !!path.progress[0]?.completedAt,
      lessons: path.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        summary: lesson.summary,
        imageUrl: lesson.imageUrl,
        difficulty: lesson.difficulty,
        order: lesson.order,
        estimatedMinutes: lesson.estimatedMinutes,
        progress: lesson.progress[0]
          ? {
              completed: lesson.progress[0].completed,
              completedAt: lesson.progress[0].completedAt,
              viewedAt: lesson.progress[0].viewedAt,
            }
          : { completed: false, viewedAt: new Date() },
      })),
    };
  }

  async getLessonDetail(lessonId: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson || lesson.status !== 'PUBLISHED') {
      throw new NotFoundException('Leçon introuvable');
    }

    await this.prisma.userLessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { viewedAt: new Date() },
      create: { userId, lessonId },
    });

    const progress = await this.prisma.userLessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    return {
      id: lesson.id,
      learningPathId: lesson.learningPathId,
      title: lesson.title,
      content: lesson.content,
      summary: lesson.summary,
      imageUrl: lesson.imageUrl,
      videoUrl: lesson.videoUrl,
      difficulty: lesson.difficulty,
      order: lesson.order,
      estimatedMinutes: lesson.estimatedMinutes,
      progress: {
        completed: progress?.completed ?? false,
        completedAt: progress?.completedAt,
        viewedAt: progress?.viewedAt ?? new Date(),
      },
    };
  }

  async completeLesson(lessonId: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        learningPath: {
          include: { lessons: { where: { status: 'PUBLISHED' } } },
        },
      },
    });

    if (!lesson) throw new NotFoundException('Leçon introuvable');

    await this.prisma.userLessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { completed: true, completedAt: new Date() },
      create: { userId, lessonId, completed: true, completedAt: new Date() },
    });

    const totalInPath = lesson.learningPath.lessons.length;
    const completedCount = await this.prisma.userLessonProgress.count({
      where: {
        userId,
        completed: true,
        lesson: { learningPathId: lesson.learningPathId },
      },
    });

    await this.prisma.userPathProgress.upsert({
      where: {
        userId_learningPathId: {
          userId,
          learningPathId: lesson.learningPathId,
        },
      },
      update: { lessonsCompleted: completedCount },
      create: {
        userId,
        learningPathId: lesson.learningPathId,
        lessonsCompleted: completedCount,
      },
    });

    if (completedCount >= totalInPath) {
      await this.prisma.userPathProgress.update({
        where: {
          userId_learningPathId: {
            userId,
            learningPathId: lesson.learningPathId,
          },
        },
        data: { completedAt: new Date() },
      });

      await this.notificationsService.create(userId, {
        type: 'PATH_COMPLETED',
        title: 'Parcours terminé !',
        body: `Félicitations ! Vous avez complété "${lesson.learningPath.title}"`,
        severity: 'INFO',
        link: `/education/paths/${lesson.learningPathId}`,
      });
    }

    return { completed: true, totalInPath, completedCount };
  }

  async getRecommendations(userId: string, customerId: string) {
    const [adviceTypes, metrics] = await Promise.all([
      this.matrixEngine.getRecommendedAdviceTypes(customerId),
      this.overviewService.gatherMetrics(customerId),
    ]);

    const scoreRes = await this.scoreEngine.calculateGlobalScore(metrics);
    const globalScore = scoreRes.globalScore;

    const [linkedLessons, scoredLessons] = await Promise.all([
      this.prisma.lesson.findMany({
        where: {
          adviceLinks: { some: { adviceType: { in: adviceTypes } } },
          status: 'PUBLISHED',
        },
        include: {
          learningPath: { select: { title: true } },
          adviceLinks: { select: { adviceType: true, priority: true } },
          progress: { where: { userId }, select: { completed: true } },
        },
      }),
      this.prisma.lesson.findMany({
        where: {
          status: 'PUBLISHED',
          OR: [
            { minScore: null, maxScore: null },
            { minScore: { lte: globalScore }, maxScore: { gte: globalScore } },
          ],
        },
        include: {
          learningPath: { select: { title: true } },
          adviceLinks: { select: { adviceType: true, priority: true } },
          progress: { where: { userId }, select: { completed: true } },
        },
      }),
    ]);

    const allLessons = [...linkedLessons, ...scoredLessons];
    const seen = new Set<string>();
    const recommendations: Array<{
      lessonId: string;
      lessonTitle: string;
      pathTitle: string;
      reason: string;
      score: number;
    }> = [];

    for (const lesson of allLessons) {
      if (seen.has(lesson.id)) continue;
      seen.add(lesson.id);
      if (lesson.progress[0]?.completed) continue;

      const isFromMatrix = adviceTypes.includes(
        lesson.adviceLinks?.[0]?.adviceType ?? '',
      );
      const matchScore = isFromMatrix ? 2 : 1;
      const reason = isFromMatrix
        ? 'Basé sur votre profil financier'
        : 'Recommandé pour votre niveau';

      recommendations.push({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        pathTitle: lesson.learningPath.title,
        reason,
        score: matchScore,
      });
    }

    return recommendations.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  // ========== Admin: Paths ==========

  async listAllPaths() {
    return this.prisma.learningPath.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { lessons: true } },
      },
    });
  }

  async listAllLessons(pathId?: string) {
    const where: any = {};
    if (pathId) where.learningPathId = pathId;
    return this.prisma.lesson.findMany({
      where,
      orderBy: { order: 'asc' },
      include: {
        learningPath: { select: { title: true } },
        _count: { select: { adviceLinks: true } },
      },
    });
  }

  async getLesson(id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        learningPath: { select: { title: true } },
        adviceLinks: true,
      },
    });
    if (!lesson) throw new NotFoundException('Leçon introuvable');
    return lesson;
  }

  async createPath(dto: CreatePathDto) {
    return this.prisma.learningPath.create({ data: dto });
  }

  async updatePath(pathId: string, dto: UpdatePathDto) {
    await this.ensurePathExists(pathId);
    return this.prisma.learningPath.update({
      where: { id: pathId },
      data: dto,
    });
  }

  async deletePath(pathId: string) {
    await this.ensurePathExists(pathId);
    return this.prisma.learningPath.update({
      where: { id: pathId },
      data: { isActive: false },
    });
  }

  // ========== Admin: Lessons ==========

  async createLesson(dto: CreateLessonDto) {
    await this.ensurePathExists(dto.learningPathId);
    return this.prisma.lesson.create({ data: dto });
  }

  async updateLesson(lessonId: string, dto: UpdateLessonDto) {
    await this.ensureLessonExists(lessonId);
    return this.prisma.lesson.update({ where: { id: lessonId }, data: dto });
  }

  async deleteLesson(lessonId: string) {
    await this.ensureLessonExists(lessonId);
    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: { status: 'ARCHIVED' },
    });
  }

  // ========== Admin: Advice Links ==========

  async createAdviceLink(dto: CreateAdviceLinkDto) {
    await this.ensureLessonExists(dto.lessonId);
    return this.prisma.lessonAdviceLink.create({ data: dto });
  }

  async deleteAdviceLink(linkId: string) {
    const link = await this.prisma.lessonAdviceLink.findUnique({
      where: { id: linkId },
    });
    if (!link) throw new NotFoundException('Lien introuvable');
    return this.prisma.lessonAdviceLink.delete({ where: { id: linkId } });
  }

  // ========== Admin: Canvas ==========

  async saveCanvas(edges: { source: string; target: string }[]) {
    const lessonPathMap = new Map<string, string>();

    for (const edge of edges) {
      const pathMatch =
        edge.source.match(/^path-(.+)$/) || edge.target.match(/^path-(.+)$/);
      const lessonMatch =
        edge.target.match(/^lesson-(.+)$/) ||
        edge.source.match(/^lesson-(.+)$/);
      if (pathMatch && lessonMatch) {
        lessonPathMap.set(lessonMatch[1], pathMatch[1]);
      }
    }

    if (lessonPathMap.size === 0) return { updated: 0 };

    const updates = Array.from(lessonPathMap.entries()).map(
      ([lessonId, pathId]) =>
        this.prisma.lesson.update({
          where: { id: lessonId },
          data: { learningPathId: pathId },
        }),
    );

    await this.prisma.$transaction(updates);
    return { updated: lessonPathMap.size };
  }

  // ========== Admin: Stats ==========

  async getPathStats() {
    const paths = await this.prisma.learningPath.findMany({
      include: {
        lessons: { where: { status: 'PUBLISHED' }, select: { id: true } },
        progress: { select: { completedAt: true, lessonsCompleted: true } },
      },
    });

    return paths.map((path) => ({
      pathId: path.id,
      pathTitle: path.title,
      totalLessons: path.lessons.length,
      totalStarts: path.progress.length,
      totalCompletions: path.progress.filter((p) => p.completedAt).length,
    }));
  }

  async getLessonStats() {
    const lessons = await this.prisma.lesson.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        progress: { select: { completed: true, viewedAt: true } },
      },
    });

    return lessons.map((lesson) => ({
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      totalViews: lesson.progress.length,
      totalCompletions: lesson.progress.filter((p) => p.completed).length,
    }));
  }

  // ========== Helpers ==========

  private async ensurePathExists(pathId: string) {
    const path = await this.prisma.learningPath.findUnique({
      where: { id: pathId },
    });
    if (!path) throw new NotFoundException('Parcours introuvable');
  }

  private async ensureLessonExists(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Leçon introuvable');
  }
}
