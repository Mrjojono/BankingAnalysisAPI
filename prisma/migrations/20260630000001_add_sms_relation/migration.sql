-- Supprimer les enregistrements SmsTransaction dont le customerId n'est pas un UUID valide
DELETE FROM sms_transactions WHERE customerId !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Supprimer ceux dont le customerId ne correspond à aucun client bancaire
DELETE FROM sms_transactions WHERE customerId NOT IN (SELECT id FROM bank_customers);

-- Ajouter l'index pour les performances
CREATE INDEX IF NOT EXISTS sms_transactions_customer_id_idx ON sms_transactions(customerId);

-- Ajouter la contrainte de clé étrangère
ALTER TABLE sms_transactions
  ADD CONSTRAINT sms_transactions_customer_id_fkey
  FOREIGN KEY (customerId) REFERENCES bank_customers(id)
  ON DELETE CASCADE;
