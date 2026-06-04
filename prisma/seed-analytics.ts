import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not defined');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

type TxDef = {
  desc: string;
  category: string;
  min: number;
  max: number;
  isCredit?: boolean;
};

const TX_TEMPLATES: TxDef[] = [
  // SALAIRE
  {
    desc: 'VIREMENT SALAIRE MENSUEL',
    category: 'SALAIRE',
    min: 250_000,
    max: 450_000,
    isCredit: true,
  },
  {
    desc: 'PRIME DE RENDEMENT MENSUELLE',
    category: 'SALAIRE',
    min: 30_000,
    max: 80_000,
    isCredit: true,
  },
  {
    desc: 'AVANCE SUR SALAIRE',
    category: 'SALAIRE',
    min: 50_000,
    max: 100_000,
    isCredit: true,
  },
  {
    desc: 'REMUNERATION PRESTATION CONSEIL',
    category: 'SALAIRE',
    min: 100_000,
    max: 200_000,
    isCredit: true,
  },
  {
    desc: 'VIREMENT SOLDE PRIME ANNUELLE',
    category: 'SALAIRE',
    min: 150_000,
    max: 300_000,
    isCredit: true,
  },
  {
    desc: 'INDEMNITE DE DEPLACEMENT',
    category: 'SALAIRE',
    min: 15_000,
    max: 40_000,
    isCredit: true,
  },
  {
    desc: 'ALLOCATION TRANSPORT MENSUELLE',
    category: 'SALAIRE',
    min: 10_000,
    max: 25_000,
    isCredit: true,
  },

  // LOGEMENT
  {
    desc: 'LOYER APPARTEMENT LOME',
    category: 'LOGEMENT',
    min: 80_000,
    max: 120_000,
  },
  {
    desc: 'FACTURE ELECTRICITE CEET',
    category: 'LOGEMENT',
    min: 8_000,
    max: 20_000,
  },
  { desc: 'FACTURE EAU TOGO', category: 'LOGEMENT', min: 3_000, max: 8_000 },
  {
    desc: 'CHARGE COPROPRIETE RESIDENCE',
    category: 'LOGEMENT',
    min: 10_000,
    max: 20_000,
  },
  {
    desc: 'ASSURANCE HABITATION ANNUELLE',
    category: 'LOGEMENT',
    min: 15_000,
    max: 30_000,
  },
  {
    desc: 'ENTRETIEN MAISON JARDINAGE',
    category: 'LOGEMENT',
    min: 5_000,
    max: 15_000,
  },
  {
    desc: 'FRAIS AGENCE LOCATION',
    category: 'LOGEMENT',
    min: 40_000,
    max: 60_000,
  },
  {
    desc: 'LOCATION BUREAU PROFESSIONNEL',
    category: 'LOGEMENT',
    min: 50_000,
    max: 100_000,
  },

  // ALIMENTATION
  {
    desc: 'COURSES SUPERMARCHE SHOPRITE',
    category: 'ALIMENTATION',
    min: 15_000,
    max: 40_000,
  },
  {
    desc: 'BOUCHERIE VIANDE LOME',
    category: 'ALIMENTATION',
    min: 5_000,
    max: 12_000,
  },
  {
    desc: 'RESTAURANT LE PALMIER',
    category: 'ALIMENTATION',
    min: 5_000,
    max: 15_000,
  },
  {
    desc: 'POISSONNERIE FRAICHEUR',
    category: 'ALIMENTATION',
    min: 3_000,
    max: 8_000,
  },
  {
    desc: 'EPICERIE PRODUITS LOCAUX',
    category: 'ALIMENTATION',
    min: 2_000,
    max: 6_000,
  },
  { desc: 'BRASSERIE LOME', category: 'ALIMENTATION', min: 3_000, max: 10_000 },
  {
    desc: 'BAKERY PATISSERIE LOME',
    category: 'ALIMENTATION',
    min: 2_000,
    max: 5_000,
  },
  { desc: 'FAST FOOD', category: 'ALIMENTATION', min: 2_000, max: 6_000 },
  {
    desc: 'COMMANDE PIZZA LIVRAISON',
    category: 'ALIMENTATION',
    min: 4_000,
    max: 9_000,
  },

  // TRANSPORT
  {
    desc: 'ABONNEMENT BUS SOTRAL',
    category: 'TRANSPORT',
    min: 5_000,
    max: 10_000,
  },
  { desc: 'TAXI LOME CENTRE', category: 'TRANSPORT', min: 1_000, max: 5_000 },
  { desc: 'BALLET TAXI VILLE', category: 'TRANSPORT', min: 2_000, max: 6_000 },
  {
    desc: 'ASSURANCE AUTO ANNUELLE',
    category: 'TRANSPORT',
    min: 40_000,
    max: 60_000,
  },
  {
    desc: 'ENTRETIEN VEHICULE GARAGE',
    category: 'TRANSPORT',
    min: 15_000,
    max: 50_000,
  },
  { desc: 'PEAGE AUTOROUTE LOME', category: 'TRANSPORT', min: 500, max: 1_500 },
  {
    desc: 'CONTROLE TECHNIQUE VEHICULE',
    category: 'TRANSPORT',
    min: 5_000,
    max: 10_000,
  },
  {
    desc: 'PERMIS DE CONDUIRE',
    category: 'TRANSPORT',
    min: 10_000,
    max: 15_000,
  },

  // SANTE
  {
    desc: 'CONSULTATION MEDECIN GENERALISTE',
    category: 'SANTE',
    min: 5_000,
    max: 10_000,
  },
  { desc: 'PHARMACIE LOME', category: 'SANTE', min: 3_000, max: 15_000 },
  {
    desc: 'ANALYSE LABORATOIRE BIOLOGIE',
    category: 'SANTE',
    min: 5_000,
    max: 12_000,
  },
  {
    desc: 'CONSULTATION HOPITAL CHU LOME',
    category: 'SANTE',
    min: 10_000,
    max: 25_000,
  },
  { desc: 'CABINET DENTISTE', category: 'SANTE', min: 10_000, max: 20_000 },
  {
    desc: 'ASSURANCE MALADIE MENSUELLE',
    category: 'SANTE',
    min: 8_000,
    max: 15_000,
  },
  {
    desc: 'FRAIS HOSPITALISATION CLINIQUE',
    category: 'SANTE',
    min: 50_000,
    max: 150_000,
  },
  { desc: 'ACHAT LUNETTES VUE', category: 'SANTE', min: 15_000, max: 30_000 },

  // MOBILE_MONEY
  {
    desc: 'DEPOT ARGENT TMOONEY',
    category: 'MOBILE_MONEY',
    min: 5_000,
    max: 50_000,
  },
  {
    desc: 'TRANSFERT TMOONEY CLIENT',
    category: 'MOBILE_MONEY',
    min: 2_000,
    max: 20_000,
  },
  {
    desc: 'PAIEMENT FLOOZ MARCHAND',
    category: 'MOBILE_MONEY',
    min: 1_000,
    max: 10_000,
  },
  {
    desc: 'RECHARGE CREDIT MOOV',
    category: 'MOBILE_MONEY',
    min: 500,
    max: 5_000,
  },
  {
    desc: 'RECHARGE CREDIT TOGOCEL',
    category: 'MOBILE_MONEY',
    min: 500,
    max: 5_000,
  },
  {
    desc: 'DEPOT TMOONEY GUICHET',
    category: 'MOBILE_MONEY',
    min: 10_000,
    max: 100_000,
  },

  // CARBURANT
  {
    desc: 'CARBURANT STATION TOTAL LOME',
    category: 'CARBURANT',
    min: 5_000,
    max: 20_000,
  },
  {
    desc: 'GASOIL SHELL LOME',
    category: 'CARBURANT',
    min: 10_000,
    max: 25_000,
  },
  {
    desc: 'ESSENCE STATION OANDO',
    category: 'CARBURANT',
    min: 5_000,
    max: 15_000,
  },
  {
    desc: 'CARBURANT STATION EXXON',
    category: 'CARBURANT',
    min: 8_000,
    max: 20_000,
  },

  // COMMERCE
  {
    desc: 'MAGASIN SHOPRITE LOME',
    category: 'COMMERCE',
    min: 10_000,
    max: 50_000,
  },
  {
    desc: 'BOUTIQUE HABILLEMENT PRET',
    category: 'COMMERCE',
    min: 8_000,
    max: 30_000,
  },
  {
    desc: 'QUINCAILLERIE ALAX MATERIAL',
    category: 'COMMERCE',
    min: 5_000,
    max: 25_000,
  },
  {
    desc: 'ELECTROMENAGER LOME',
    category: 'COMMERCE',
    min: 25_000,
    max: 100_000,
  },
  {
    desc: 'MARCHE LOME PRODUITS',
    category: 'COMMERCE',
    min: 3_000,
    max: 10_000,
  },
  { desc: 'LIBRAIRIE PAPETERIE', category: 'COMMERCE', min: 2_000, max: 8_000 },
  {
    desc: 'INTERNET BOX ABONNEMENT',
    category: 'COMMERCE',
    min: 15_000,
    max: 25_000,
  },
  {
    desc: 'COSMETIQUE PARFUMERIE',
    category: 'COMMERCE',
    min: 5_000,
    max: 15_000,
  },
  {
    desc: 'SPORT SALLE DE SPORT',
    category: 'COMMERCE',
    min: 5_000,
    max: 10_000,
  },

  // FRAIS_BANCAIRES
  {
    desc: 'FRAIS TENUE DE COMPTE',
    category: 'FRAIS_BANCAIRES',
    min: 1_500,
    max: 3_000,
  },
  {
    desc: 'FRAIS VIREMENT BANCAIRE',
    category: 'FRAIS_BANCAIRES',
    min: 500,
    max: 1_500,
  },
  {
    desc: 'COTISATION CARTE VISA',
    category: 'FRAIS_BANCAIRES',
    min: 3_000,
    max: 5_000,
  },
  {
    desc: 'COMMISSION TRANSFERT INTERNATIONAL',
    category: 'FRAIS_BANCAIRES',
    min: 2_000,
    max: 5_000,
  },
  {
    desc: 'FRAIS RELEVE COMPTE',
    category: 'FRAIS_BANCAIRES',
    min: 500,
    max: 1_000,
  },
  {
    desc: 'COMMISSION VIREMENT SEPA',
    category: 'FRAIS_BANCAIRES',
    min: 1_000,
    max: 3_000,
  },

  // VIREMENTS
  {
    desc: 'VIREMENT FOURNISSEUR PRESTATION',
    category: 'VIREMENTS',
    min: 50_000,
    max: 200_000,
  },
  {
    desc: 'REMBOURSEMENT FRAIS MISSION',
    category: 'VIREMENTS',
    min: 20_000,
    max: 50_000,
    isCredit: true,
  },
  {
    desc: 'TRANSFERT INTERNE COMPTE',
    category: 'VIREMENTS',
    min: 10_000,
    max: 100_000,
  },
  {
    desc: 'VIREMENT TRESORERIE SOCIETE',
    category: 'VIREMENTS',
    min: 200_000,
    max: 500_000,
  },
  {
    desc: 'VIREMENT CLIENT FACTURE',
    category: 'VIREMENTS',
    min: 30_000,
    max: 150_000,
    isCredit: true,
  },
  {
    desc: 'VIREMENT FREELANCE PRESTATION',
    category: 'VIREMENTS',
    min: 40_000,
    max: 120_000,
    isCredit: true,
  },

  // RETRAITS
  {
    desc: 'RETRAIT GUICHET AGENCE LOME',
    category: 'RETRAITS',
    min: 10_000,
    max: 100_000,
  },
  {
    desc: 'RETRAIT DAB LOME CENTRE',
    category: 'RETRAITS',
    min: 5_000,
    max: 50_000,
  },
  {
    desc: 'RETRAIT DISTRIBUTEUR AUTOMATIQUE',
    category: 'RETRAITS',
    min: 5_000,
    max: 30_000,
  },

  // CREDIT / REMBOURSEMENT
  {
    desc: 'REMBOURSEMENT CREDIT AUTOMOBILE',
    category: 'CREDIT',
    min: 80_000,
    max: 120_000,
  },
  {
    desc: 'ECHEANCE PRET PERSONNEL',
    category: 'CREDIT',
    min: 30_000,
    max: 60_000,
  },
  {
    desc: 'REMBOURSEMENT CREDIT IMMOBILIER',
    category: 'CREDIT',
    min: 100_000,
    max: 150_000,
  },
  {
    desc: 'ECHEANCE CREDIT COMMERCE',
    category: 'CREDIT',
    min: 40_000,
    max: 80_000,
  },
  {
    desc: 'REMBOURSEMENT CREDIT SCOLAIRE',
    category: 'CREDIT',
    min: 20_000,
    max: 50_000,
  },
  {
    desc: 'REMBOURSEMENT DECOUVERT AUTORISE',
    category: 'CREDIT',
    min: 25_000,
    max: 50_000,
  },

  // DEPOTS
  {
    desc: 'DEPOT ESPECE AGENCE LOME',
    category: 'DEPOTS',
    min: 20_000,
    max: 100_000,
    isCredit: true,
  },
  {
    desc: 'REMISE CHEQUE BANCAIRE',
    category: 'DEPOTS',
    min: 50_000,
    max: 200_000,
    isCredit: true,
  },
  {
    desc: 'DEPOT DISTRIBUTEUR AUTOMATIQUE',
    category: 'DEPOTS',
    min: 10_000,
    max: 50_000,
    isCredit: true,
  },
  {
    desc: 'VIREMENT RECU TIERS',
    category: 'DEPOTS',
    min: 10_000,
    max: 30_000,
    isCredit: true,
  },

  // INTERETS
  {
    desc: 'INTERETS CREDIT CONSOMMATION',
    category: 'INTERETS',
    min: 3_000,
    max: 8_000,
  },
  {
    desc: 'FRAIS INTERET DECOUVERT',
    category: 'INTERETS',
    min: 2_000,
    max: 5_000,
  },
  {
    desc: 'REMUNERATION EPARGNE MENSUELLE',
    category: 'INTERETS',
    min: 500,
    max: 2_000,
    isCredit: true,
  },
  {
    desc: 'PENALITE RETARD PRET',
    category: 'INTERETS',
    min: 2_000,
    max: 5_000,
  },

  // DIVERS
  {
    desc: 'COTISATION ASSOCIATION PARENTS',
    category: 'DIVERS',
    min: 3_000,
    max: 5_000,
  },
  {
    desc: 'DON CARITATIF ASSOCIATION',
    category: 'DIVERS',
    min: 5_000,
    max: 10_000,
  },
  {
    desc: 'TIMBRE FISCAL ADMINISTRATION',
    category: 'DIVERS',
    min: 500,
    max: 2_000,
  },
  {
    desc: 'FRAIS DOSSIER ADMINISTRATIF',
    category: 'DIVERS',
    min: 2_000,
    max: 5_000,
  },
  {
    desc: 'FACTURE TELEPHONE FIXE',
    category: 'DIVERS',
    min: 3_000,
    max: 6_000,
  },
  {
    desc: 'COTISATION MUTUELLE SANTE',
    category: 'DIVERS',
    min: 5_000,
    max: 10_000,
  },
  {
    desc: 'FORMATION PROFESSIONNELLE',
    category: 'DIVERS',
    min: 20_000,
    max: 50_000,
  },
  {
    desc: 'ABONNEMENT BIBLIOTHEQUE',
    category: 'DIVERS',
    min: 1_000,
    max: 3_000,
  },
  {
    desc: 'FRAIS SCOLAIRES ECOLE',
    category: 'DIVERS',
    min: 50_000,
    max: 200_000,
  },
  { desc: 'ASSURANCE VOYAGE', category: 'DIVERS', min: 10_000, max: 25_000 },
  { desc: 'FACTURE HOTEL LOME', category: 'DIVERS', min: 20_000, max: 50_000 },
  {
    desc: 'PAIEMENT SERVICES EN LIGNE',
    category: 'DIVERS',
    min: 2_000,
    max: 10_000,
  },
  { desc: 'COTISATION SYNDICALE', category: 'DIVERS', min: 3_000, max: 5_000 },
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  console.log('🚀 Démarrage du seed analytics 2026...');

  // 1. Récupérer ou créer les clients bancaires
  let mainCustomer = await prisma.bankCustomer.findFirst({
    where: { email: 'jean.dupont@email.tg' },
  });
  if (!mainCustomer) {
    mainCustomer = await prisma.bankCustomer.create({
      data: {
        email: 'jean.dupont@email.tg',
        firstName: 'Jean',
        lastName: 'Dupont',
        telephone: '+22890123456',
        accountNumber: 'TG123456789',
        customerCode: 'CUST001',
        kycStatus: 'VERIFIED' as any,
      },
    });
    console.log('  ✅ Client principal créé:', mainCustomer.id);
  } else {
    console.log('  ✅ Client principal trouvé:', mainCustomer.id);
  }

  let secondCustomer = await prisma.bankCustomer.findFirst({
    where: { email: 'marie.amos@email.tg' },
  });
  if (!secondCustomer) {
    secondCustomer = await prisma.bankCustomer.create({
      data: {
        email: 'marie.amos@email.tg',
        firstName: 'Marie',
        lastName: 'Amos',
        telephone: '+22890876543',
        accountNumber: 'TG987654321',
        customerCode: 'CUST002',
        kycStatus: 'VERIFIED' as any,
      },
    });
    console.log('  ✅ Second client créé:', secondCustomer.id);
  } else {
    console.log('  ✅ Second client trouvé:', secondCustomer.id);
  }

  // 2. Récupérer ou créer le Grand Livre
  let ledger = await prisma.ledger.findFirst({ where: { code: 'PRINCIPAL' } });
  if (!ledger) {
    ledger = await prisma.ledger.create({
      data: { code: 'PRINCIPAL', name: 'Grand Livre Principal' },
    });
    console.log('  ✅ Grand Livre créé:', ledger.id);
  } else {
    console.log('  ✅ Grand Livre trouvé:', ledger.id);
  }

  // 3. Récupérer ou créer le Journal
  let journal = await prisma.journal.findFirst({
    where: { code: 'JOURNAL_GENERAL' },
  });
  if (!journal) {
    journal = await prisma.journal.create({
      data: {
        code: 'JOURNAL_GENERAL',
        name: 'Journal Général',
        journalType: 'GENERAL' as any,
        ledgerId: ledger.id,
      },
    });
    console.log('  ✅ Journal créé:', journal.id);
  } else {
    console.log('  ✅ Journal trouvé:', journal.id);
  }

  // 4. Récupérer ou créer les comptes GL
  async function getOrCreateAccount(
    code: string,
    name: string,
    glType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE',
    balType: 'DEBIT' | 'CREDIT',
  ) {
    let account = await prisma.account.findFirst({
      where: { code, ledgerId: ledger!.id },
    });
    if (!account) {
      account = await prisma.account.create({
        data: {
          code,
          name,
          glAccountType: glType,
          balanceType: balType,
          ledgerId: ledger!.id,
        },
      });
    }
    return account;
  }

  const suspenseAccount = await getOrCreateAccount(
    '470000',
    'Suspense / Contrepartie',
    'ASSET',
    'DEBIT',
  );
  console.log('  ✅ Compte suspense:', suspenseAccount.id);

  // 5. Récupérer ou créer les comptes bancaires (BankAccount + Account)
  async function getOrCreateBankAccount(
    customerId: string,
    accountType: 'CHECKING' | 'SAVINGS',
    accountCode: string,
    accountName: string,
  ) {
    const glAccount = await getOrCreateAccount(
      accountCode,
      accountName,
      accountType === 'SAVINGS' ? 'LIABILITY' : 'ASSET',
      accountType === 'SAVINGS' ? 'CREDIT' : 'DEBIT',
    );

    let bankAcc = await prisma.bankAccount.findFirst({
      where: { customerId, accountId: glAccount.id },
    });
    if (!bankAcc) {
      bankAcc = await prisma.bankAccount.create({
        data: {
          customerId,
          accountId: glAccount.id,
          accountType: accountType as any,
          currency: 'XOF',
        },
      });
    }
    return { glAccount, bankAcc };
  }

  const mainChecking = await getOrCreateBankAccount(
    mainCustomer.id,
    'CHECKING',
    '511100',
    'Compte Chèque Principal',
  );
  const mainSavings = await getOrCreateBankAccount(
    mainCustomer.id,
    'SAVINGS',
    '511200',
    'Compte Epargne Principal',
  );
  const secondChecking = await getOrCreateBankAccount(
    secondCustomer.id,
    'CHECKING',
    '511101',
    'Compte Chèque Second',
  );

  console.log('  ✅ Comptes bancaires OK');
  console.log('  ✅ Comptes bancaires OK');

  // 6. Vérifier les transactions existantes — skip si déjà présentes
  const existingCount = await prisma.transaction.count({
    where: {
      transactionDate: {
        gte: new Date('2026-01-01'),
        lte: new Date('2026-12-31'),
      },
    },
  });
  if (existingCount > 0) {
    console.log(`  ⏩ ${existingCount} transactions 2026 déjà en base — rien à créer.`);
    await prisma.$disconnect();
    return;
  }

  // 7. Générer les transactions pour chaque mois de 2026
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  let totalCreated = 0;

  const recurringMap = new Map<string, TxDef[]>(); // catégories récurrentes → templates

  for (const month of months) {
    const year = 2026;

    // Transactions récurrentes fixes (chaque mois)
    const monthlyFixedTx: {
      desc: string;
      amount: number;
      isCredit?: boolean;
      day: number;
    }[] = [
      // Salaire le 1er-2 du mois
      {
        desc: 'VIREMENT SALAIRE MENSUEL',
        amount: randInt(350_000, 420_000),
        isCredit: true,
        day: 2,
      },
      {
        desc: 'ALLOCATION TRANSPORT MENSUELLE',
        amount: randInt(15_000, 20_000),
        isCredit: true,
        day: 2,
      },

      // Loyer le 5
      {
        desc: 'LOYER APPARTEMENT LOME',
        amount: randInt(95_000, 105_000),
        day: 5,
      },

      // Factures autour du 10-15
      {
        desc: 'FACTURE ELECTRICITE CEET',
        amount: randInt(10_000, 18_000),
        day: 12,
      },
      { desc: 'FACTURE EAU TOGO', amount: randInt(4_000, 7_000), day: 12 },

      // Télécoms
      { desc: 'RECHARGE CREDIT MOOV', amount: randInt(2_000, 5_000), day: 1 },
      {
        desc: 'INTERNET BOX ABONNEMENT',
        amount: randInt(18_000, 22_000),
        day: 8,
      },

      // Assurance
      {
        desc: 'ASSURANCE MALADIE MENSUELLE',
        amount: randInt(10_000, 12_000),
        day: 8,
      },
      {
        desc: 'COTISATION MUTUELLE SANTE',
        amount: randInt(5_000, 8_000),
        day: 8,
      },

      // Épargne
      {
        desc: 'TRANSFERT INTERNE COMPTE',
        amount: randInt(25_000, 40_000),
        day: 3,
      },

      // Remboursements crédits
      {
        desc: 'ECHEANCE PRET PERSONNEL',
        amount: randInt(40_000, 55_000),
        day: 15,
      },
    ];

    if (month === 1) {
      monthlyFixedTx.push(
        {
          desc: 'ASSURANCE AUTO ANNUELLE',
          amount: randInt(45_000, 55_000),
          day: 15,
        },
        {
          desc: 'ASSURANCE HABITATION ANNUELLE',
          amount: randInt(20_000, 25_000),
          day: 15,
        },
        {
          desc: 'CONTROLE TECHNIQUE VEHICULE',
          amount: randInt(6_000, 9_000),
          day: 20,
        },
      );
    }

    if (month === 3 || month === 6 || month === 9 || month === 12) {
      monthlyFixedTx.push({
        desc: 'VIREMENT SOLDE PRIME ANNUELLE',
        amount: randInt(180_000, 250_000),
        isCredit: true,
        day: 25,
      });
    }

    if (month === 9) {
      monthlyFixedTx.push({
        desc: 'FRAIS SCOLAIRES ECOLE',
        amount: randInt(120_000, 180_000),
        day: 1,
      });
    }

    // Générer les transactions récurrentes fixes de ce mois
    for (const tx of monthlyFixedTx) {
      const txDate = new Date(Date.UTC(year, month - 1, tx.day, 10, 0, 0));
      const amount = BigInt(tx.amount);

      const receiverId = tx.isCredit ? mainCustomer.id : secondCustomer.id;
      const senderId = tx.isCredit ? secondCustomer.id : mainCustomer.id;

      await prisma.transaction.create({
        data: {
          description: tx.desc,
          transactionType: 'INTERNAL_TRANSFER' as any,
          status: 'POSTED' as any,
          amount,
          currency: 'XOF',
          transactionDate: txDate,
          journalId: journal.id,
          ledgerId: ledger.id,
          senderCustomerId: senderId,
          receiverCustomerId: receiverId,
          entries: {
            create: [
              {
                direction: tx.isCredit ? ('CREDIT' as any) : ('DEBIT' as any),
                amount,
                currency: 'XOF',
                sequence: 1,
                accountId: mainChecking.glAccount.id,
                journalId: journal.id,
                ledgerId: ledger.id,
              },
              {
                direction: tx.isCredit ? ('DEBIT' as any) : ('CREDIT' as any),
                amount,
                currency: 'XOF',
                sequence: 2,
                accountId: suspenseAccount.id,
                journalId: journal.id,
                ledgerId: ledger.id,
              },
            ],
          },
        },
      });
      totalCreated++;
    }

    // Générer des transactions variables aléatoires
    const numVariable = randInt(15, 28);
    for (let i = 0; i < numVariable; i++) {
      const template = pickRandom(TX_TEMPLATES);
      const day = randInt(1, 28);
      const hour = randInt(7, 20);
      const minute = randInt(0, 59);
      const txDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

      const amountVal = randInt(template.min, template.max);
      const amount = BigInt(amountVal);
      const isCredit = template.isCredit ?? false;

      const receiverId = isCredit ? mainCustomer.id : secondCustomer.id;
      const senderId = isCredit ? secondCustomer.id : mainCustomer.id;

      // Pour les dépôts d'épargne, utiliser le compte SAVINGS comme target
      const targetAccount =
        template.category === 'DEPOTS' ||
        (template.desc.includes('INTERNE') && month === 3)
          ? mainSavings.glAccount
          : mainChecking.glAccount;

      try {
        await prisma.transaction.create({
          data: {
            description: template.desc,
            transactionType: 'INTERNAL_TRANSFER' as any,
            status: 'POSTED' as any,
            amount,
            currency: 'XOF',
            transactionDate: txDate,
            journalId: journal.id,
            ledgerId: ledger.id,
            senderCustomerId: senderId,
            receiverCustomerId: receiverId,
            entries: {
              create: [
                {
                  direction: isCredit ? ('CREDIT' as any) : ('DEBIT' as any),
                  amount,
                  currency: 'XOF',
                  sequence: 1,
                  accountId: targetAccount.id,
                  journalId: journal.id,
                  ledgerId: ledger.id,
                },
                {
                  direction: isCredit ? ('DEBIT' as any) : ('CREDIT' as any),
                  amount,
                  currency: 'XOF',
                  sequence: 2,
                  accountId: suspenseAccount.id,
                  journalId: journal.id,
                  ledgerId: ledger.id,
                },
              ],
            },
          },
        });
        totalCreated++;
      } catch (err: any) {
        console.error(
          `    ❌ Erreur sur "${template.desc}" (mois ${month}):`,
          err.message,
        );
      }
    }

    console.log(
      `  📆 Mois ${month}/2026 : généré ${monthlyFixedTx.length + numVariable} transactions`,
    );
  }

  console.log(
    `\n🎉 Terminé ! ${totalCreated} transactions créées au total pour 2026.`,
  );

  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error('❌ Erreur fatale:', err);
  process.exit(1);
});
