-- CreateEnum: SmsTransactionStatus (already exists from 20260730000001)
-- Add columns to sms_transactions for CamenBert pipeline v2
-- Prisma fields are camelCase (cbCategory, cbConfidence, arbitration) without @map, so columns must be camelCase

ALTER TABLE sms_transactions ADD COLUMN IF NOT EXISTS "cbCategory" TEXT;
ALTER TABLE sms_transactions ADD COLUMN IF NOT EXISTS "cbConfidence" DOUBLE PRECISION;
ALTER TABLE sms_transactions ADD COLUMN IF NOT EXISTS "arbitration" TEXT;
ALTER TABLE sms_transactions ADD COLUMN IF NOT EXISTS "disagreed" BOOLEAN NOT NULL DEFAULT false;

-- Remove the snake_case columns that were mistakenly created by the manual migration
ALTER TABLE sms_transactions DROP COLUMN IF EXISTS "cb_category";
ALTER TABLE sms_transactions DROP COLUMN IF EXISTS "cb_confidence";