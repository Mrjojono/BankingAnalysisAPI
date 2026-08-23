import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate2026(month: number, day: number): Date {
  const d = new Date(2026, month - 1, day);
  d.setHours(randomBetween(7, 20), randomBetween(0, 59), 0, 0);
  return d;
}

async function main() {
  console.log('Seeding demo banking data...');

  const existing = await prisma.bankCustomer.findFirst({
    where: { customerCode: { in: ['CUS-DEMO-001', 'CUS-DEMO-002'] } },
  });
  if (existing) {
    console.log('Demo data already exists. Skipping.');
    return;
  }

  let ledger = await prisma.ledger.findUnique({ where: { code: 'DEMO' } });
  if (!ledger) {
    ledger = await prisma.ledger.create({
      data: { code: 'DEMO', name: 'Demo Ledger' },
    });
  }

  let journal = await prisma.journal.findFirst({ where: { code: 'DEMO-GEN' } });
  if (!journal) {
    journal = await prisma.journal.create({
      data: { code: 'DEMO-GEN', name: 'Demo General Journal', journalType: 'GENERAL', ledgerId: ledger.id },
    });
  }

  async function getOrCreateAccount(code: string, name: string, glAccountType: string, balanceType: string) {
    const existing = await prisma.account.findFirst({ where: { code, ledgerId: ledger!.id } });
    if (existing) return existing;
    return prisma.account.create({
      data: {
        code, name,
        glAccountType: glAccountType as any,
        balanceType: balanceType as any,
        currency: 'XOF',
        ledgerId: ledger!.id,
      },
    });
  }

  const glChecking1 = await getOrCreateAccount('DEMO-CHK-1', 'Koffi Checking', 'ASSET', 'DEBIT');
  const glSavings1 = await getOrCreateAccount('DEMO-SAV-1', 'Koffi Savings', 'ASSET', 'DEBIT');
  const glChecking2 = await getOrCreateAccount('DEMO-CHK-2', 'Aminata Checking', 'ASSET', 'DEBIT');
  const glSavings2 = await getOrCreateAccount('DEMO-SAV-2', 'Aminata Savings', 'ASSET', 'DEBIT');

  // Crée les écritures comptables (Entry) pour une transaction.
  // DEBIT = sortie d'argent, CREDIT = entrée d'argent (vue solde client).
  async function createEntriesForTransaction(
    transaction: { id: string; amount: bigint | number; transactionType: string },
    checkingGlId: string,
    savingsGlId: string,
  ) {
    const base = {
      transactionId: transaction.id,
      journalId: journal!.id,
      ledgerId: ledger!.id,
      currency: 'XOF' as const,
      accountVersion: 0,
      version: 0,
    };

    if (transaction.transactionType === 'DEPOSIT') {
      await prisma.entry.create({
        data: { ...base, direction: 'CREDIT', amount: transaction.amount, accountId: checkingGlId, sequence: 1 },
      });
    } else if (transaction.transactionType === 'INTERNAL_TRANSFER') {
      await prisma.entry.create({
        data: { ...base, direction: 'DEBIT', amount: transaction.amount, accountId: checkingGlId, sequence: 1 },
      });
      await prisma.entry.create({
        data: { ...base, direction: 'CREDIT', amount: transaction.amount, accountId: savingsGlId, sequence: 2 },
      });
    } else {
      // WITHDRAWAL | MERCHANT_PAYMENT
      await prisma.entry.create({
        data: { ...base, direction: 'DEBIT', amount: transaction.amount, accountId: checkingGlId, sequence: 1 },
      });
    }
  }

  // Synchronise le solde du compte GL avec le solde reconstruit depuis les entries,
  // pour garder la cohérence entre l'écran compte et les analytics.
  async function syncAccountBalance(glAccountId: string, customerId: string) {
    const entries = await prisma.entry.findMany({ where: { accountId: glAccountId } });
    let net = 0n;
    for (const e of entries) {
      net += e.direction === 'CREDIT' ? e.amount : -e.amount;
    }
    await prisma.account.update({
      where: { id: glAccountId },
      data: {
        settledDebit: net >= 0n ? net : 0n,
        settledCredit: net < 0n ? -net : 0n,
        availableDebit: net >= 0n ? net : 0n,
        availableCredit: net < 0n ? -net : 0n,
      },
    });
  }

  // =========================================
  // CUSTOMER 1: Koffi Ahadji - Salarié avec revenus divers
  // =========================================
  const customer1 = await prisma.bankCustomer.create({
    data: {
      email: 'nutsukpuijoan@gmail.com',
      firstName: 'joan',
      lastName: 'kekeli',
      telephone: '+22890123456',
      accountNumber: '0010000003',
      customerCode: 'CUS-DEMO-001',
      kycStatus: 'VERIFIED',
      kycVerifiedAt: randomDate2026(1, 15),
    },
  });

  await prisma.bankAccount.create({
    data: {
      customerId: customer1.id,
      accountId: glChecking1.id,
      iban: '1000000001',
      accountType: 'CHECKING',
      currency: 'XOF',
      dailyLimit: 1000000,
      monthlyLimit: 5000000,
    },
  });

  await prisma.bankAccount.create({
    data: {
      customerId: customer1.id,
      accountId: glSavings1.id,
      iban: '1000000002',
      accountType: 'SAVINGS',
      currency: 'XOF',
      dailyLimit: 2000000,
      monthlyLimit: 10000000,
    },
  });

  await prisma.account.update({
    where: { id: glChecking1.id },
    data: { settledDebit: 450000, availableDebit: 450000, settledCredit: 0, availableCredit: 0 },
  });
  await prisma.account.update({
    where: { id: glSavings1.id },
    data: { settledDebit: 850000, availableDebit: 850000, settledCredit: 0, availableCredit: 0 },
  });

  // =========================================
  // CUSTOMER 2: Aminata Diallo - Entrepreneur
  // =========================================
  const customer2 = await prisma.bankCustomer.create({
    data: {
      email: 'nutsukpuijoankekeli@gmail.com',
      firstName: 'Aminata',
      lastName: 'Diallo',
      telephone: '+22890123457',
      accountNumber: '0010000002',
      customerCode: 'CUS-DEMO-002',
      kycStatus: 'VERIFIED',
      kycVerifiedAt: randomDate2026(1, 10),
    },
  });

  await prisma.bankAccount.create({
    data: {
      customerId: customer2.id,
      accountId: glChecking2.id,
      iban: '1000000003',
      accountType: 'CHECKING',
      currency: 'XOF',
      dailyLimit: 2000000,
      monthlyLimit: 15000000,
    },
  });

  await prisma.bankAccount.create({
    data: {
      customerId: customer2.id,
      accountId: glSavings2.id,
      iban: '1000000004',
      accountType: 'SAVINGS',
      currency: 'XOF',
      dailyLimit: 5000000,
      monthlyLimit: 25000000,
    },
  });

  await prisma.account.update({
    where: { id: glChecking2.id },
    data: { settledDebit: 1500000, availableDebit: 1500000, settledCredit: 0, availableCredit: 0 },
  });
  await prisma.account.update({
    where: { id: glSavings2.id },
    data: { settledDebit: 2000000, availableDebit: 2000000, settledCredit: 0, availableCredit: 0 },
  });

  // =========================================
  // TRANSACTIONS KOFI 2026 - TRES DIVERSIFIEES
  // =========================================
  const koffiTransactions: { desc: string; amount: number; type: 'DEPOSIT' | 'WITHDRAWAL' | 'MERCHANT_PAYMENT' | 'INTERNAL_TRANSFER'; month: number; day: number }[] = [
    // JANVIER 2026 - Revenus
    { desc: 'Salaire ORABANK Janvier', amount: 380000, type: 'DEPOSIT', month: 1, day: 5 },
    { desc: 'Prime Janvier', amount: 50000, type: 'DEPOSIT', month: 1, day: 5 },
    { desc: 'Virement tiers - Jean', amount: 25000, type: 'DEPOSIT', month: 1, day: 8 },
    { desc: 'Remboursement santé CNAM', amount: 35000, type: 'DEPOSIT', month: 1, day: 12 },
    { desc: 'Revente scooter', amount: 150000, type: 'DEPOSIT', month: 1, day: 20 },

    // JANVIER 2026 - Dépenses alimentation
    { desc: 'Supermarché Casino', amount: 78500, type: 'MERCHANT_PAYMENT', month: 1, day: 6 },
    { desc: 'Marché Akodessewa', amount: 15000, type: 'MERCHANT_PAYMENT', month: 1, day: 7 },
    { desc: 'Marché Akodessewa', amount: 8500, type: 'MERCHANT_PAYMENT', month: 1, day: 14 },
    { desc: 'Supermarché Score', amount: 42000, type: 'MERCHANT_PAYMENT', month: 1, day: 15 },
    { desc: 'Restaurant Le Golfe', amount: 18000, type: 'MERCHANT_PAYMENT', month: 1, day: 18 },
    { desc: 'Marché Akodessewa', amount: 12000, type: 'MERCHANT_PAYMENT', month: 1, day: 21 },
    { desc: 'Food delivery Glovo', amount: 5500, type: 'MERCHANT_PAYMENT', month: 1, day: 22 },
    { desc: 'Supermarché Casino', amount: 35000, type: 'MERCHANT_PAYMENT', month: 1, day: 25 },
    { desc: 'Boulangerie', amount: 2500, type: 'MERCHANT_PAYMENT', month: 1, day: 28 },
    { desc: 'Marché Akodessewa', amount: 9500, type: 'MERCHANT_PAYMENT', month: 1, day: 30 },

    // JANVIER 2026 - Dépenses quotidiennes
    { desc: 'Electricité CEET', amount: 18500, type: 'WITHDRAWAL', month: 1, day: 3 },
    { desc: 'Eau TdE', amount: 7500, type: 'WITHDRAWAL', month: 1, day: 3 },
    { desc: 'Mobile Moov', amount: 5000, type: 'WITHDRAWAL', month: 1, day: 5 },
    { desc: 'Essence Total', amount: 25000, type: 'MERCHANT_PAYMENT', month: 1, day: 7 },
    { desc: 'Transport Taxi', amount: 2000, type: 'WITHDRAWAL', month: 1, day: 8 },
    { desc: 'Internet Canalbox', amount: 12000, type: 'WITHDRAWAL', month: 1, day: 10 },
    { desc: 'Netflix', amount: 5000, type: 'WITHDRAWAL', month: 1, day: 12 },
    { desc: 'Essence Total', amount: 20000, type: 'MERCHANT_PAYMENT', month: 1, day: 15 },
    { desc: 'Transport Zema', amount: 1500, type: 'WITHDRAWAL', month: 1, day: 18 },
    { desc: 'Spotify', amount: 2500, type: 'WITHDRAWAL', month: 1, day: 20 },
    { desc: 'Mobile Moov', amount: 5000, type: 'WITHDRAWAL', month: 1, day: 22 },
    { desc: 'Essence Total', amount: 22000, type: 'MERCHANT_PAYMENT', month: 1, day: 25 },
    { desc: 'Transport Taxi', amount: 3000, type: 'WITHDRAWAL', month: 1, day: 28 },

    // JANVIER 2026 - Shopping & Services
    { desc: 'Pharmacie', amount: 8500, type: 'MERCHANT_PAYMENT', month: 1, day: 9 },
    { desc: 'Vêtements Mandarin', amount: 45000, type: 'MERCHANT_PAYMENT', month: 1, day: 16 },
    { desc: 'Coiffeur', amount: 8000, type: 'MERCHANT_PAYMENT', month: 1, day: 19 },
    { desc: 'Electronique Shop', amount: 125000, type: 'MERCHANT_PAYMENT', month: 1, day: 23 },
    { desc: 'Assurance GTA', amount: 35000, type: 'WITHDRAWAL', month: 1, day: 26 },
    { desc: 'Cadeau mariage', amount: 25000, type: 'MERCHANT_PAYMENT', month: 1, day: 27 },

    // JANVIER 2026 - Transfers
    { desc: 'Virement épargne', amount: 50000, type: 'INTERNAL_TRANSFER', month: 1, day: 6 },
    { desc: 'Virement Mama', amount: 30000, type: 'INTERNAL_TRANSFER', month: 1, day: 10 },
    { desc: 'Virement épargne', amount: 30000, type: 'INTERNAL_TRANSFER', month: 1, day: 20 },

    // FEVRIER 2026
    { desc: 'Salaire ORABANK Fevrier', amount: 380000, type: 'DEPOSIT', month: 2, day: 5 },
    { desc: 'Remboursement pret', amount: 45000, type: 'DEPOSIT', month: 2, day: 15 },
    { desc: 'Revenu freelance design', amount: 75000, type: 'DEPOSIT', month: 2, day: 22 },

    { desc: 'Supermarché Score', amount: 52000, type: 'MERCHANT_PAYMENT', month: 2, day: 3 },
    { desc: 'Marché Akodessewa', amount: 18000, type: 'MERCHANT_PAYMENT', month: 2, day: 7 },
    { desc: 'Restaurant BSB', amount: 25000, type: 'MERCHANT_PAYMENT', month: 2, day: 14 },
    { desc: 'Supermarché Casino', amount: 38000, type: 'MERCHANT_PAYMENT', month: 2, day: 18 },
    { desc: 'Marché Akodessewa', amount: 10000, type: 'MERCHANT_PAYMENT', month: 2, day: 21 },
    { desc: 'Food delivery', amount: 7000, type: 'MERCHANT_PAYMENT', month: 2, day: 25 },
    { desc: 'Boucherie', amount: 12000, type: 'MERCHANT_PAYMENT', month: 2, day: 28 },

    { desc: 'Electricité CEET', amount: 22000, type: 'WITHDRAWAL', month: 2, day: 3 },
    { desc: 'Eau TdE', amount: 8500, type: 'WITHDRAWAL', month: 2, day: 3 },
    { desc: 'Essence Total', amount: 28000, type: 'MERCHANT_PAYMENT', month: 2, day: 8 },
    { desc: 'Internet', amount: 12000, type: 'WITHDRAWAL', month: 2, day: 10 },
    { desc: 'Mobile', amount: 5000, type: 'WITHDRAWAL', month: 2, day: 15 },
    { desc: 'Netflix Spotify', amount: 7500, type: 'WITHDRAWAL', month: 2, day: 20 },
    { desc: 'Essence', amount: 25000, type: 'MERCHANT_PAYMENT', month: 2, day: 22 },

    { desc: 'Pharmacie', amount: 12000, type: 'MERCHANT_PAYMENT', month: 2, day: 5 },
    { desc: 'Vêtements', amount: 65000, type: 'MERCHANT_PAYMENT', month: 2, day: 12 },
    { desc: 'Sport salle', amount: 15000, type: 'WITHDRAWAL', month: 2, day: 16 },
    { desc: 'Cadeau Saint-Valentin', amount: 35000, type: 'MERCHANT_PAYMENT', month: 2, day: 14 },

    { desc: 'Virement épargne', amount: 50000, type: 'INTERNAL_TRANSFER', month: 2, day: 6 },
    { desc: 'Virement Mama', amount: 25000, type: 'INTERNAL_TRANSFER', month: 2, day: 18 },

    // MARS 2026
    { desc: 'Salaire ORABANK Mars', amount: 380000, type: 'DEPOSIT', month: 3, day: 5 },
    { desc: 'Bonus projet', amount: 80000, type: 'DEPOSIT', month: 3, day: 18 },
    { desc: 'Dividendes', amount: 45000, type: 'DEPOSIT', month: 3, day: 25 },
    { desc: 'Location garage', amount: 50000, type: 'DEPOSIT', month: 3, day: 28 },

    { desc: 'Supermarché', amount: 62000, type: 'MERCHANT_PAYMENT', month: 3, day: 4 },
    { desc: 'Marché', amount: 15000, type: 'MERCHANT_PAYMENT', month: 3, day: 8 },
    { desc: 'Restaurant', amount: 22000, type: 'MERCHANT_PAYMENT', month: 3, day: 12 },
    { desc: 'Supermarché Casino', amount: 45000, type: 'MERCHANT_PAYMENT', month: 3, day: 15 },
    { desc: 'Marché Akodessewa', amount: 18000, type: 'MERCHANT_PAYMENT', month: 3, day: 18 },
    { desc: 'Epicerie', amount: 8000, type: 'MERCHANT_PAYMENT', month: 3, day: 20 },
    { desc: 'Restaurant', amount: 15000, type: 'MERCHANT_PAYMENT', month: 3, day: 25 },
    { desc: 'Supermarché Score', amount: 55000, type: 'MERCHANT_PAYMENT', month: 3, day: 28 },

    { desc: 'Electricité', amount: 19500, type: 'WITHDRAWAL', month: 3, day: 3 },
    { desc: 'Eau', amount: 8000, type: 'WITHDRAWAL', month: 3, day: 3 },
    { desc: 'Essence', amount: 30000, type: 'MERCHANT_PAYMENT', month: 3, day: 7 },
    { desc: 'Internet', amount: 12000, type: 'WITHDRAWAL', month: 3, day: 10 },
    { desc: 'Mobile', amount: 5000, type: 'WITHDRAWAL', month: 3, day: 15 },
    { desc: 'Transport', amount: 5000, type: 'WITHDRAWAL', month: 3, day: 18 },
    { desc: 'Essence', amount: 25000, type: 'MERCHANT_PAYMENT', month: 3, day: 22 },
    { desc: 'Netflix', amount: 5000, type: 'WITHDRAWAL', month: 3, day: 25 },

    { desc: 'Pharmacie', amount: 9500, type: 'MERCHANT_PAYMENT', month: 3, day: 6 },
    { desc: 'Assurance auto', amount: 85000, type: 'WITHDRAWAL', month: 3, day: 12 },
    { desc: 'Vêtements', amount: 78000, type: 'MERCHANT_PAYMENT', month: 3, day: 16 },
    { desc: 'Coiffeur', amount: 10000, type: 'MERCHANT_PAYMENT', month: 3, day: 20 },

    { desc: 'Virement épargne', amount: 75000, type: 'INTERNAL_TRANSFER', month: 3, day: 6 },
    { desc: 'Virement frere', amount: 40000, type: 'INTERNAL_TRANSFER', month: 3, day: 15 },
    { desc: 'Virement épargne', amount: 50000, type: 'INTERNAL_TRANSFER', month: 3, day: 26 },

    // AVRIL 2026
    { desc: 'Salaire ORABANK Avril', amount: 380000, type: 'DEPOSIT', month: 4, day: 5 },
    { desc: 'Remboursement santé', amount: 28000, type: 'DEPOSIT', month: 4, day: 12 },
    { desc: 'Revente telephone', amount: 85000, type: 'DEPOSIT', month: 4, day: 22 },
    { desc: 'Prime Paques', amount: 60000, type: 'DEPOSIT', month: 4, day: 17 },

    { desc: 'Supermarché', amount: 58000, type: 'MERCHANT_PAYMENT', month: 4, day: 3 },
    { desc: 'Marché', amount: 20000, type: 'MERCHANT_PAYMENT', month: 4, day: 7 },
    { desc: 'Restaurant', amount: 30000, type: 'MERCHANT_PAYMENT', month: 4, day: 10 },
    { desc: 'Supermarché Casino', amount: 42000, type: 'MERCHANT_PAYMENT', month: 4, day: 14 },
    { desc: 'Marché', amount: 12000, type: 'MERCHANT_PAYMENT', month: 4, day: 18 },
    { desc: 'Boulangerie', amount: 3500, type: 'MERCHANT_PAYMENT', month: 4, day: 20 },
    { desc: 'Food delivery', amount: 8000, type: 'MERCHANT_PAYMENT', month: 4, day: 23 },
    { desc: 'Supermarché Score', amount: 48000, type: 'MERCHANT_PAYMENT', month: 4, day: 26 },
    { desc: 'Marché', amount: 15000, type: 'MERCHANT_PAYMENT', month: 4, day: 29 },

    { desc: 'Electricité', amount: 18000, type: 'WITHDRAWAL', month: 4, day: 3 },
    { desc: 'Eau', amount: 7500, type: 'WITHDRAWAL', month: 4, day: 3 },
    { desc: 'Essence', amount: 28000, type: 'MERCHANT_PAYMENT', month: 4, day: 8 },
    { desc: 'Internet', amount: 12000, type: 'WITHDRAWAL', month: 4, day: 10 },
    { desc: 'Mobile', amount: 5000, type: 'WITHDRAWAL', month: 4, day: 15 },
    { desc: 'Transport', amount: 4000, type: 'WITHDRAWAL', month: 4, day: 18 },
    { desc: 'Essence', amount: 22000, type: 'MERCHANT_PAYMENT', month: 4, day: 22 },
    { desc: 'Netflix Spotify', amount: 7500, type: 'WITHDRAWAL', month: 4, day: 25 },

    { desc: 'Pharmacie', amount: 15000, type: 'MERCHANT_PAYMENT', month: 4, day: 5 },
    { desc: 'Medecin', amount: 25000, type: 'MERCHANT_PAYMENT', month: 4, day: 14 },
    { desc: 'Sport', amount: 15000, type: 'WITHDRAWAL', month: 4, day: 16 },
    { desc: 'Vêtements', amount: 55000, type: 'MERCHANT_PAYMENT', month: 4, day: 21 },

    { desc: 'Virement épargne', amount: 60000, type: 'INTERNAL_TRANSFER', month: 4, day: 6 },
    { desc: 'Virement Mama', amount: 35000, type: 'INTERNAL_TRANSFER', month: 4, day: 20 },

    // MAI 2026
    { desc: 'Salaire ORABANK Mai', amount: 380000, type: 'DEPOSIT', month: 5, day: 5 },
    { desc: 'Salaire complementaire', amount: 120000, type: 'DEPOSIT', month: 5, day: 15 },
    { desc: 'Virement cousin', amount: 20000, type: 'DEPOSIT', month: 5, day: 18 },
    { desc: 'Remboursement achat', amount: 15000, type: 'DEPOSIT', month: 5, day: 25 },

    { desc: 'Supermarché', amount: 65000, type: 'MERCHANT_PAYMENT', month: 5, day: 4 },
    { desc: 'Marché', amount: 18000, type: 'MERCHANT_PAYMENT', month: 5, day: 8 },
    { desc: 'Restaurant fete', amount: 45000, type: 'MERCHANT_PAYMENT', month: 5, day: 10 },
    { desc: 'Supermarché Casino', amount: 38000, type: 'MERCHANT_PAYMENT', month: 5, day: 14 },
    { desc: 'Marché', amount: 22000, type: 'MERCHANT_PAYMENT', month: 5, day: 18 },
    { desc: 'Epicerie', amount: 9000, type: 'MERCHANT_PAYMENT', month: 5, day: 21 },
    { desc: 'Restaurant', amount: 18000, type: 'MERCHANT_PAYMENT', month: 5, day: 24 },
    { desc: 'Supermarché', amount: 52000, type: 'MERCHANT_PAYMENT', month: 5, day: 27 },
    { desc: 'Marché', amount: 14000, type: 'MERCHANT_PAYMENT', month: 5, day: 30 },

    { desc: 'Electricité', amount: 25000, type: 'WITHDRAWAL', month: 5, day: 3 },
    { desc: 'Eau', amount: 9000, type: 'WITHDRAWAL', month: 5, day: 3 },
    { desc: 'Essence', amount: 30000, type: 'MERCHANT_PAYMENT', month: 5, day: 7 },
    { desc: 'Internet', amount: 12000, type: 'WITHDRAWAL', month: 5, day: 10 },
    { desc: 'Mobile', amount: 5000, type: 'WITHDRAWAL', month: 5, day: 15 },
    { desc: 'Transport', amount: 6000, type: 'WITHDRAWAL', month: 5, day: 18 },
    { desc: 'Essence', amount: 28000, type: 'MERCHANT_PAYMENT', month: 5, day: 22 },
    { desc: 'Netflix', amount: 5000, type: 'WITHDRAWAL', month: 5, day: 25 },

    { desc: 'Pharmacie', amount: 11000, type: 'MERCHANT_PAYMENT', month: 5, day: 6 },
    { desc: 'Fete mariage', amount: 75000, type: 'MERCHANT_PAYMENT', month: 5, day: 12 },
    { desc: 'Coiffeur', amount: 12000, type: 'MERCHANT_PAYMENT', month: 5, day: 16 },
    { desc: 'Vêtements', amount: 95000, type: 'MERCHANT_PAYMENT', month: 5, day: 20 },
    { desc: 'Assurance vie', amount: 45000, type: 'WITHDRAWAL', month: 5, day: 28 },

    { desc: 'Virement épargne', amount: 80000, type: 'INTERNAL_TRANSFER', month: 5, day: 6 },
    { desc: 'Virement Mama', amount: 40000, type: 'INTERNAL_TRANSFER', month: 5, day: 15 },
    { desc: 'Virement épargne', amount: 50000, type: 'INTERNAL_TRANSFER', month: 5, day: 26 },

    // JUIN 2026
    { desc: 'Salaire ORABANK Juin', amount: 380000, type: 'DEPOSIT', month: 6, day: 5 },
    { desc: 'Prime semestre', amount: 150000, type: 'DEPOSIT', month: 6, day: 20 },
    { desc: 'Revenu freelance', amount: 95000, type: 'DEPOSIT', month: 6, day: 25 },

    { desc: 'Supermarché', amount: 72000, type: 'MERCHANT_PAYMENT', month: 6, day: 3 },
    { desc: 'Marché', amount: 20000, type: 'MERCHANT_PAYMENT', month: 6, day: 7 },
    { desc: 'Restaurant', amount: 35000, type: 'MERCHANT_PAYMENT', month: 6, day: 11 },
    { desc: 'Supermarché Casino', amount: 45000, type: 'MERCHANT_PAYMENT', month: 6, day: 14 },
    { desc: 'Marché', amount: 16000, type: 'MERCHANT_PAYMENT', month: 6, day: 18 },
    { desc: 'Epicerie', amount: 8000, type: 'MERCHANT_PAYMENT', month: 6, day: 21 },
    { desc: 'Food delivery', amount: 9000, type: 'MERCHANT_PAYMENT', month: 6, day: 23 },
    { desc: 'Supermarché Score', amount: 58000, type: 'MERCHANT_PAYMENT', month: 6, day: 26 },
    { desc: 'Marché', amount: 18000, type: 'MERCHANT_PAYMENT', month: 6, day: 29 },

    { desc: 'Electricité', amount: 28000, type: 'WITHDRAWAL', month: 6, day: 3 },
    { desc: 'Eau', amount: 10000, type: 'WITHDRAWAL', month: 6, day: 3 },
    { desc: 'Essence', amount: 32000, type: 'MERCHANT_PAYMENT', month: 6, day: 8 },
    { desc: 'Internet', amount: 12000, type: 'WITHDRAWAL', month: 6, day: 10 },
    { desc: 'Mobile', amount: 5000, type: 'WITHDRAWAL', month: 6, day: 15 },
    { desc: 'Transport', amount: 5000, type: 'WITHDRAWAL', month: 6, day: 18 },
    { desc: 'Essence', amount: 25000, type: 'MERCHANT_PAYMENT', month: 6, day: 22 },
    { desc: 'Netflix Spotify', amount: 7500, type: 'WITHDRAWAL', month: 6, day: 25 },

    { desc: 'Pharmacie', amount: 18000, type: 'MERCHANT_PAYMENT', month: 6, day: 5 },
    { desc: 'Veterinaire', amount: 35000, type: 'MERCHANT_PAYMENT', month: 6, day: 12 },
    { desc: 'Sport', amount: 15000, type: 'WITHDRAWAL', month: 6, day: 16 },
    { desc: 'Electronique', amount: 180000, type: 'MERCHANT_PAYMENT', month: 6, day: 21 },

    { desc: 'Virement épargne', amount: 100000, type: 'INTERNAL_TRANSFER', month: 6, day: 6 },
    { desc: 'Virement frere', amount: 50000, type: 'INTERNAL_TRANSFER', month: 6, day: 18 },
    { desc: 'Virement épargne', amount: 75000, type: 'INTERNAL_TRANSFER', month: 6, day: 27 },

    // JUILLET 2026
    { desc: 'Salaire ORABANK Juillet', amount: 380000, type: 'DEPOSIT', month: 7, day: 5 },
    { desc: 'Remboursement CNAM', amount: 42000, type: 'DEPOSIT', month: 7, day: 10 },
    { desc: 'Vente vieux PC', amount: 65000, type: 'DEPOSIT', month: 7, day: 22 },

    { desc: 'Supermarché', amount: 68000, type: 'MERCHANT_PAYMENT', month: 7, day: 4 },
    { desc: 'Marché', amount: 22000, type: 'MERCHANT_PAYMENT', month: 7, day: 8 },
    { desc: 'Restaurant', amount: 28000, type: 'MERCHANT_PAYMENT', month: 7, day: 12 },
    { desc: 'Supermarché Casino', amount: 52000, type: 'MERCHANT_PAYMENT', month: 7, day: 16 },
    { desc: 'Marché', amount: 18000, type: 'MERCHANT_PAYMENT', month: 7, day: 20 },
    { desc: 'Epicerie', amount: 10000, type: 'MERCHANT_PAYMENT', month: 7, day: 24 },
    { desc: 'Restaurant', amount: 20000, type: 'MERCHANT_PAYMENT', month: 7, day: 27 },
    { desc: 'Supermarché', amount: 45000, type: 'MERCHANT_PAYMENT', month: 7, day: 30 },

    { desc: 'Electricité', amount: 32000, type: 'WITHDRAWAL', month: 7, day: 3 },
    { desc: 'Eau', amount: 11000, type: 'WITHDRAWAL', month: 7, day: 3 },
    { desc: 'Essence', amount: 35000, type: 'MERCHANT_PAYMENT', month: 7, day: 7 },
    { desc: 'Internet', amount: 12000, type: 'WITHDRAWAL', month: 7, day: 10 },
    { desc: 'Mobile', amount: 5000, type: 'WITHDRAWAL', month: 7, day: 15 },
    { desc: 'Transport', amount: 6000, type: 'WITHDRAWAL', month: 7, day: 18 },
    { desc: 'Essence', amount: 30000, type: 'MERCHANT_PAYMENT', month: 7, day: 22 },
    { desc: 'Netflix', amount: 5000, type: 'WITHDRAWAL', month: 7, day: 25 },

    { desc: 'Pharmacie', amount: 14000, type: 'MERCHANT_PAYMENT', month: 7, day: 6 },
    { desc: 'Fete tabaski', amount: 120000, type: 'MERCHANT_PAYMENT', month: 7, day: 14 },
    { desc: 'Coiffeur', amount: 15000, type: 'MERCHANT_PAYMENT', month: 7, day: 19 },
    { desc: 'Cadeau', amount: 45000, type: 'MERCHANT_PAYMENT', month: 7, day: 23 },

    { desc: 'Virement épargne', amount: 60000, type: 'INTERNAL_TRANSFER', month: 7, day: 6 },
    { desc: 'Virement Mama', amount: 50000, type: 'INTERNAL_TRANSFER', month: 7, day: 16 },
    { desc: 'Virement épargne', amount: 50000, type: 'INTERNAL_TRANSFER', month: 7, day: 28 },
  ];

  // Create all Koffi transactions + entries
  for (const tx of koffiTransactions) {
    const txnDate = randomDate2026(tx.month, tx.day);
    const created = await prisma.transaction.create({
      data: {
        description: tx.desc,
        transactionType: tx.type,
        status: 'POSTED',
        amount: tx.amount,
        currency: 'XOF',
        transactionDate: txnDate,
        effectiveAt: txnDate,
        postedAt: txnDate,
        journalId: journal!.id,
        ledgerId: ledger!.id,
        senderCustomerId: tx.type === 'DEPOSIT' ? undefined : customer1.id,
        receiverCustomerId: tx.type === 'DEPOSIT' || tx.type === 'INTERNAL_TRANSFER' ? customer1.id : undefined,
      },
    });
    await createEntriesForTransaction(created, glChecking1.id, glSavings1.id);
  }

  console.log(`Created ${koffiTransactions.length} transactions for Koffi`);

  // =========================================
  // TRANSACTIONS AMINATA (moins nombreuses pour test)
  // =========================================
  const aminataTransactions: { desc: string; amount: number; type: 'DEPOSIT' | 'WITHDRAWAL' | 'MERCHANT_PAYMENT' | 'INTERNAL_TRANSFER'; month: number; day: number }[] = [
    { desc: 'Salaire ORABANK Janvier', amount: 380000, type: 'DEPOSIT', month: 1, day: 5 },
    { desc: 'Supermarché Casino', amount: 65000, type: 'MERCHANT_PAYMENT', month: 1, day: 8 },
    { desc: 'Electricité CEET', amount: 25000, type: 'WITHDRAWAL', month: 1, day: 10 },
    { desc: 'Essence', amount: 30000, type: 'MERCHANT_PAYMENT', month: 1, day: 12 },
    { desc: 'Marché', amount: 18000, type: 'MERCHANT_PAYMENT', month: 1, day: 15 },
    { desc: 'Restaurant', amount: 20000, type: 'MERCHANT_PAYMENT', month: 1, day: 18 },
    { desc: 'Transport', amount: 8000, type: 'WITHDRAWAL', month: 1, day: 20 },
    { desc: 'Virement épargne', amount: 50000, type: 'INTERNAL_TRANSFER', month: 1, day: 25 },

    { desc: 'Salaire ORABANK Fevrier', amount: 380000, type: 'DEPOSIT', month: 2, day: 5 },
    { desc: 'Supermarché', amount: 58000, type: 'MERCHANT_PAYMENT', month: 2, day: 10 },
    { desc: 'Marché', amount: 15000, type: 'MERCHANT_PAYMENT', month: 2, day: 15 },
    { desc: 'Restaurant', amount: 25000, type: 'MERCHANT_PAYMENT', month: 2, day: 20 },
    { desc: 'Virement épargne', amount: 50000, type: 'INTERNAL_TRANSFER', month: 2, day: 25 },

    { desc: 'Salaire ORABANK Mars', amount: 380000, type: 'DEPOSIT', month: 3, day: 5 },
    { desc: 'Supermarché Score', amount: 72000, type: 'MERCHANT_PAYMENT', month: 3, day: 8 },
    { desc: 'Marché Akodessewa', amount: 20000, type: 'MERCHANT_PAYMENT', month: 3, day: 12 },
    { desc: 'Electricité', amount: 28000, type: 'WITHDRAWAL', month: 3, day: 15 },
    { desc: 'Essence', amount: 35000, type: 'MERCHANT_PAYMENT', month: 3, day: 18 },
    { desc: 'Restaurant', amount: 30000, type: 'MERCHANT_PAYMENT', month: 3, day: 22 },
    { desc: 'Virement épargne', amount: 60000, type: 'INTERNAL_TRANSFER', month: 3, day: 26 },

    { desc: 'Salaire ORABANK Avril', amount: 380000, type: 'DEPOSIT', month: 4, day: 5 },
    { desc: 'Supermarché', amount: 55000, type: 'MERCHANT_PAYMENT', month: 4, day: 10 },
    { desc: 'Marché', amount: 18000, type: 'MERCHANT_PAYMENT', month: 4, day: 15 },
    { desc: 'Virement épargne', amount: 50000, type: 'INTERNAL_TRANSFER', month: 4, day: 20 },

    { desc: 'Salaire ORABANK Mai', amount: 380000, type: 'DEPOSIT', month: 5, day: 5 },
    { desc: 'Supermarché', amount: 60000, type: 'MERCHANT_PAYMENT', month: 5, day: 10 },
    { desc: 'Marché', amount: 22000, type: 'MERCHANT_PAYMENT', month: 5, day: 15 },
    { desc: 'Restaurant', amount: 28000, type: 'MERCHANT_PAYMENT', month: 5, day: 20 },
    { desc: 'Virement épargne', amount: 55000, type: 'INTERNAL_TRANSFER', month: 5, day: 25 },

    { desc: 'Salaire ORABANK Juin', amount: 380000, type: 'DEPOSIT', month: 6, day: 5 },
    { desc: 'Supermarché', amount: 68000, type: 'MERCHANT_PAYMENT', month: 6, day: 10 },
    { desc: 'Marché', amount: 20000, type: 'MERCHANT_PAYMENT', month: 6, day: 15 },
    { desc: 'Electricité', amount: 30000, type: 'WITHDRAWAL', month: 6, day: 18 },
    { desc: 'Virement épargne', amount: 60000, type: 'INTERNAL_TRANSFER', month: 6, day: 22 },

    { desc: 'Salaire ORABANK Juillet', amount: 380000, type: 'DEPOSIT', month: 7, day: 5 },
    { desc: 'Supermarché', amount: 55000, type: 'MERCHANT_PAYMENT', month: 7, day: 10 },
    { desc: 'Marché', amount: 18000, type: 'MERCHANT_PAYMENT', month: 7, day: 15 },
    { desc: 'Virement épargne', amount: 50000, type: 'INTERNAL_TRANSFER', month: 7, day: 20 },
  ];

  for (const tx of aminataTransactions) {
    const txnDate = randomDate2026(tx.month, tx.day);
    const created = await prisma.transaction.create({
      data: {
        description: tx.desc,
        transactionType: tx.type,
        status: 'POSTED',
        amount: tx.amount,
        currency: 'XOF',
        transactionDate: txnDate,
        effectiveAt: txnDate,
        postedAt: txnDate,
        journalId: journal!.id,
        ledgerId: ledger!.id,
        senderCustomerId: tx.type === 'DEPOSIT' ? undefined : customer2.id,
        receiverCustomerId: tx.type === 'DEPOSIT' || tx.type === 'INTERNAL_TRANSFER' ? customer2.id : undefined,
      },
    });
    await createEntriesForTransaction(created, glChecking2.id, glSavings2.id);
  }

  console.log(`Created ${aminataTransactions.length} transactions for Aminata`);

  // =========================================
  // SYNC GL BALANCES (coherence compte <-> analytics)
  // =========================================
  await syncAccountBalance(glChecking1.id, customer1.id);
  await syncAccountBalance(glSavings1.id, customer1.id);
  await syncAccountBalance(glChecking2.id, customer2.id);
  await syncAccountBalance(glSavings2.id, customer2.id);

  // =========================================
  // BENEFICIARIES
  // =========================================
  await prisma.beneficiary.createMany({
    data: [
      { customerId: customer1.id, name: 'Marie Ahadji', accountNumber: '0010000050', bankName: 'Orabank Togo', isVerified: true },
      { customerId: customer1.id, name: 'Jean Komlan', accountNumber: '0020000100', bankName: 'Ecobank Togo', isVerified: true },
      { customerId: customer1.id, name: 'Sophie Mensah', accountNumber: '0030000200', bankName: 'Societe Generale', isVerified: false },
      { customerId: customer1.id, name: 'Papa Ahadji', accountNumber: '0010000100', bankName: 'Orabank Togo', isVerified: true },
      { customerId: customer1.id, name: 'Frere Kodjo', accountNumber: '0020000200', bankName: 'Ecobank Togo', isVerified: true },
      { customerId: customer2.id, name: 'Mamadou Diallo', accountNumber: '0010000300', bankName: 'Orabank Togo', isVerified: true },
      { customerId: customer2.id, name: 'Fatou Sane', accountNumber: '0040000400', bankName: 'BOA Togo', isVerified: true },
      { customerId: customer2.id, name: 'Ibrahima Sissoko', accountNumber: '0050000500', bankName: 'Orabank Togo', isVerified: false },
      { customerId: customer2.id, name: 'Aissata Ba', accountNumber: '0020000600', bankName: 'Ecobank Togo', isVerified: true },
    ],
  });

  console.log('Demo banking data seeded successfully!');
  console.log('');
  console.log('  Customers (no app account):');
  console.log('    Koffi Ahadji  — tel: +22890123456, compte: 0010000001');
  console.log('    Aminata Diallo — tel: +22890123457, compte: 0010000002');
  console.log('');
  console.log('  Transactions 2026:');
  console.log('    Koffi:', koffiTransactions.length, 'transactions (Jan-Juil 2026)');
  console.log('    Aminata:', aminataTransactions.length, 'transactions (Jan-Juil 2026)');
  console.log('');
  console.log('  No User records created. Link manually during demo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
