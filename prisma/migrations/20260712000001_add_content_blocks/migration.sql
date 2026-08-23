-- Add contentBlocks JSONB column to lessons table
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "contentBlocks" JSONB;
