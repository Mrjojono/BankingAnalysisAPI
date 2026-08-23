-- CreateEnum: UserAccountStatus (missing from initial migration)
DO $$ BEGIN
    CREATE TYPE "UserAccountStatus" AS ENUM ('ACTIVE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add status column to users (was added via db push, not in any migration)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" "UserAccountStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterEnum: add INACTIVE value (safe even if already exists in main DB)
DO $$ BEGIN
    ALTER TYPE "UserAccountStatus" ADD VALUE 'INACTIVE';
EXCEPTION WHEN duplicate_object THEN null;
END $$;
