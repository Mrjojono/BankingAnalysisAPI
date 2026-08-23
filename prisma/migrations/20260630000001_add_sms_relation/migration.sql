-- CreateTable: sms_transactions (matching SmsTransaction Prisma model)
CREATE TABLE IF NOT EXISTS sms_transactions (
    id SERIAL NOT NULL,
    "customerId" UUID NOT NULL,
    "smsId" INTEGER NOT NULL,
    address TEXT NOT NULL,
    body TEXT NOT NULL,
    amount INTEGER,
    direction TEXT,
    operator TEXT,
    sender TEXT,
    "dateSent" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sms_transactions_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX sms_transactions_customerId_smsId_key ON sms_transactions("customerId", "smsId");

-- Supprimer les enregistrements SmsTransaction dont le customerId n'est pas un UUID valide
DELETE FROM sms_transactions WHERE "customerId"::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Supprimer ceux dont le customerId ne correspond à aucun client bancaire
DELETE FROM sms_transactions WHERE "customerId" NOT IN (SELECT id FROM bank_customers);

-- Ajouter l'index pour les performances
CREATE INDEX IF NOT EXISTS sms_transactions_customerId_idx ON sms_transactions("customerId");

-- Ajouter la contrainte de clé étrangère
ALTER TABLE sms_transactions
  ADD CONSTRAINT sms_transactions_customerId_fkey
  FOREIGN KEY ("customerId") REFERENCES bank_customers(id)
  ON DELETE CASCADE;
