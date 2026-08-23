-- CreateEnum: if not already existing
DO $$ BEGIN
    CREATE TYPE "NotificationType" AS ENUM ('ADVICE', 'SCORE_CHANGE', 'ELIGIBILITY', 'EDUCATIONAL', 'SYSTEM', 'ADMIN_BROADCAST', 'WEEKLY_DIGEST', 'LESSON_RECOMMENDED', 'PATH_COMPLETED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationChannel" AS ENUM ('PUSH', 'IN_APP', 'EMAIL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "UserBankConnectionRole" AS ENUM ('OWNER', 'DELEGATE', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RuleType" AS ENUM ('ELIGIBILITY', 'LIMIT', 'FEE', 'VALUE_DATE', 'INTEREST');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RulePeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'PER_TRANSACTION');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RuleOperator" AS ENUM ('GREATER_THAN', 'LESS_THAN', 'EQUALS', 'GREATER_OR_EQUAL', 'LESS_OR_EQUAL', 'BETWEEN', 'NOT_EQUALS', 'IN', 'NOT_IN');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateTable: push_tokens
CREATE TABLE "push_tokens" (
    id TEXT NOT NULL,
    "userId" UUID NOT NULL,
    token TEXT NOT NULL,
    platform TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT push_tokens_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX push_tokens_token_key ON push_tokens(token);
CREATE INDEX push_tokens_userId_idx ON push_tokens("userId");

-- CreateTable: notifications
CREATE TABLE "notifications" (
    id TEXT NOT NULL,
    "userId" UUID NOT NULL,
    type "NotificationType" NOT NULL,
    channel "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    severity TEXT,
    link TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notifications_pkey PRIMARY KEY (id)
);
CREATE INDEX notifications_userId_isRead_idx ON notifications("userId", "isRead");
CREATE INDEX notifications_userId_createdAt_idx ON notifications("userId", "createdAt");

-- CreateTable: notification_prefs
CREATE TABLE "notification_prefs" (
    id TEXT NOT NULL,
    "userId" UUID NOT NULL,
    push BOOLEAN NOT NULL DEFAULT true,
    email BOOLEAN NOT NULL DEFAULT false,
    types JSONB,
    CONSTRAINT notification_prefs_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX notification_prefs_userId_key ON notification_prefs("userId");

-- CreateTable: scheduled_notifications
CREATE TABLE "scheduled_notifications" (
    id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'ADMIN_BROADCAST',
    severity TEXT NOT NULL DEFAULT 'INFO',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    recurrence TEXT,
    "lastSentAt" TIMESTAMP(3),
    active BOOLEAN NOT NULL DEFAULT true,
    "targetType" TEXT NOT NULL DEFAULT 'all',
    "targetIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT scheduled_notifications_pkey PRIMARY KEY (id)
);
CREATE INDEX scheduled_notifications_active_scheduledAt_idx ON scheduled_notifications(active, "scheduledAt");

-- CreateTable: user_bank_connections
CREATE TABLE "user_bank_connections" (
    id TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "bankCustomerId" UUID NOT NULL,
    role "UserBankConnectionRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT user_bank_connections_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX user_bank_connections_bankCustomerId_key ON user_bank_connections("bankCustomerId");
CREATE UNIQUE INDEX user_bank_connections_userId_bankCustomerId_key ON user_bank_connections("userId", "bankCustomerId");
CREATE INDEX user_bank_connections_userId_idx ON user_bank_connections("userId");
CREATE INDEX user_bank_connections_bankCustomerId_idx ON user_bank_connections("bankCustomerId");

-- CreateTable: bank_products
CREATE TABLE "bank_products" (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    reference TEXT,
    category TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT bank_products_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX bank_products_code_key ON bank_products(code);

-- CreateTable: rules
CREATE TABLE "rules" (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    "productId" UUID,
    code TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    type "RuleType" NOT NULL,
    field TEXT NOT NULL,
    operator "RuleOperator",
    value DOUBLE PRECISION,
    "valueMin" DOUBLE PRECISION,
    "valueMax" DOUBLE PRECISION,
    percentage DOUBLE PRECISION,
    "flatAmount" DOUBLE PRECISION,
    "minAmount" DOUBLE PRECISION,
    "maxAmount" DOUBLE PRECISION,
    currency "Currency",
    period "RulePeriod",
    conditions JSONB,
    weight INTEGER NOT NULL DEFAULT 0,
    priority INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT rules_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX rules_productId_code_key ON rules("productId", code);
CREATE INDEX rules_productId_idx ON rules("productId");
CREATE INDEX rules_type_idx ON rules(type);

-- AddForeignKey: push_tokens
ALTER TABLE "push_tokens" ADD CONSTRAINT push_tokens_userId_fkey FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: notifications
ALTER TABLE "notifications" ADD CONSTRAINT notifications_userId_fkey FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: notification_prefs
ALTER TABLE "notification_prefs" ADD CONSTRAINT notification_prefs_userId_fkey FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: user_bank_connections
ALTER TABLE "user_bank_connections" ADD CONSTRAINT user_bank_connections_userId_fkey FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_bank_connections" ADD CONSTRAINT user_bank_connections_bankCustomerId_fkey FOREIGN KEY ("bankCustomerId") REFERENCES "bank_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: lessons → bank_products (relatedProductId)
ALTER TABLE "lessons" ADD CONSTRAINT lessons_relatedProductId_fkey FOREIGN KEY ("relatedProductId") REFERENCES "bank_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: rules
ALTER TABLE "rules" ADD CONSTRAINT rules_productId_fkey FOREIGN KEY ("productId") REFERENCES "bank_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
