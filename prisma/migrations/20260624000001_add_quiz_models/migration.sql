-- CreateEnum
CREATE TYPE "QuizQuestionType" AS ENUM ('MCQ', 'TRUE_FALSE');
CREATE TYPE "QuizStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable: quizzes
CREATE TABLE "quizzes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "QuizStatus" NOT NULL DEFAULT 'DRAFT',
    "passingScore" INTEGER NOT NULL DEFAULT 70,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: quiz_questions
CREATE TABLE "quiz_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quizId" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "type" "QuizQuestionType" NOT NULL DEFAULT 'MCQ',
    "explanation" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "quiz_questions_quizId_idx" ON "quiz_questions"("quizId");
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: quiz_choices
CREATE TABLE "quiz_choices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "questionId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "quiz_choices_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "quiz_choices_questionId_idx" ON "quiz_choices"("questionId");
ALTER TABLE "quiz_choices" ADD CONSTRAINT "quiz_choices_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: quiz_lesson_links
CREATE TABLE "quiz_lesson_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quizId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    CONSTRAINT "quiz_lesson_links_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "quiz_lesson_links_quizId_lessonId_key" ON "quiz_lesson_links"("quizId", "lessonId");
ALTER TABLE "quiz_lesson_links" ADD CONSTRAINT "quiz_lesson_links_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quiz_lesson_links" ADD CONSTRAINT "quiz_lesson_links_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: quiz_attempts
CREATE TABLE "quiz_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "quizId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "quiz_attempts_userId_quizId_idx" ON "quiz_attempts"("userId", "quizId");
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: quiz_answers
CREATE TABLE "quiz_answers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attemptId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "choiceId" UUID NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    CONSTRAINT "quiz_answers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "quiz_answers_attemptId_idx" ON "quiz_answers"("attemptId");
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "quiz_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_choiceId_fkey" FOREIGN KEY ("choiceId") REFERENCES "quiz_choices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
