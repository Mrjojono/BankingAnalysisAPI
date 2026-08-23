-- CreateEnum: SmsTransactionStatus
CREATE TYPE "SmsTransactionStatus" AS ENUM ('PENDING', 'APPROVED', 'IGNORED');

-- AlterTable: sms_transactions — ajout des champs de contrôle/analyse
ALTER TABLE sms_transactions ADD COLUMN IF NOT EXISTS "status" "SmsTransactionStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE sms_transactions ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE sms_transactions ADD COLUMN IF NOT EXISTS "counterparty" TEXT;
ALTER TABLE sms_transactions ADD COLUMN IF NOT EXISTS "balanceAfter" DOUBLE PRECISION;
ALTER TABLE sms_transactions ADD COLUMN IF NOT EXISTS "referenceNo" TEXT;
ALTER TABLE sms_transactions ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION;
ALTER TABLE sms_transactions ADD COLUMN IF NOT EXISTS "fingerprint" TEXT;
ALTER TABLE sms_transactions ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE sms_transactions ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT;
ALTER TABLE sms_transactions ADD COLUMN IF NOT EXISTS "matchRuleId" UUID;

-- CreateTable: sms_filter_rules (matching SmsFilterRule Prisma model)
CREATE TABLE IF NOT EXISTS sms_filter_rules (
    id UUID NOT NULL,
    "customerId" UUID,
    operator TEXT,
    address TEXT,
    keyword TEXT,
    direction TEXT,
    action TEXT NOT NULL DEFAULT 'IGNORE',
    description TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT sms_filter_rules_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS sms_transactions_fingerprint_key ON sms_transactions("fingerprint");
CREATE INDEX IF NOT EXISTS sms_transactions_status_idx ON sms_transactions("status");
CREATE INDEX IF NOT EXISTS sms_transactions_operator_idx ON sms_transactions("operator");
CREATE INDEX IF NOT EXISTS sms_transactions_matchRuleId_idx ON sms_transactions("matchRuleId");
CREATE INDEX IF NOT EXISTS sms_filter_rules_customerId_idx ON sms_filter_rules("customerId");
CREATE INDEX IF NOT EXISTS sms_filter_rules_isActive_idx ON sms_filter_rules("isActive");

-- Foreign key: sms_transactions.matchRuleId -> sms_filter_rules.id
ALTER TABLE sms_transactions
  ADD CONSTRAINT sms_transactions_matchRuleId_fkey
  FOREIGN KEY ("matchRuleId") REFERENCES sms_filter_rules(id)
  ON DELETE SET NULL;
