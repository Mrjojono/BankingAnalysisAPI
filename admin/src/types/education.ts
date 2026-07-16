export type LessonDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type LessonStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type QuizStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type QuizQuestionType = 'MCQ' | 'TRUE_FALSE';

export interface LessonProgress {
  completed: boolean;
  completedAt: string | null;
  viewedAt: string | null;
}

export interface LessonSummary {
  id: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  difficulty: LessonDifficulty;
  order: number;
  estimatedMinutes: number | null;
  minScore: number | null;
  maxScore: number | null;
}

export interface PathSummary {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  difficulty: LessonDifficulty;
  order: number;
  totalLessons: number;
  completedLessons: number;
  isCompleted: boolean;
  lessons: LessonSummary[];
}

export interface LessonWithProgress extends LessonSummary {
  learningPathId: string;
  progress: LessonProgress;
}

export interface PathDetail {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  difficulty: LessonDifficulty;
  order: number;
  totalLessons: number;
  completedLessons: number;
  isCompleted: boolean;
  lessons: LessonWithProgress[];
}

export type ContentBlockType = 'header' | 'text' | 'callout' | 'list' | 'image' | 'divider' | 'miniQuiz';

export interface ContentBlock {
  type: ContentBlockType;
  text?: string;
  level?: number;
  variant?: string;
  items?: string[];
  ordered?: boolean;
  url?: string;
  alt?: string;
  caption?: string;
  question?: string;
  choices?: string[];
  correctIndex?: number;
  explanation?: string;
}

export interface LessonDetail {
  id: string;
  learningPathId: string;
  title: string;
  content: string;
  contentBlocks?: ContentBlock[] | null;
  summary: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  difficulty: LessonDifficulty;
  order: number;
  estimatedMinutes: number | null;
  progress: LessonProgress;
}

export interface CompleteLessonResponse {
  completed: true;
  totalInPath: number;
  completedCount: number;
}

export interface Recommendation {
  lessonId: string;
  lessonTitle: string;
  pathTitle: string;
  reason: 'Basé sur votre profil financier' | 'Recommandé pour votre niveau';
  score: number;
}

export interface QuizChoice {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  question: string;
  type: QuizQuestionType;
  explanation: string | null;
  order: number;
  choices: QuizChoice[];
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  status: QuizStatus;
  passingScore: number;
  questions: QuizQuestion[];
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  score: number;
  total: number;
  passed: boolean;
  startedAt: string;
  completedAt: string | null;
}
