/**
 * SEED — Conditions Générales Orabank Togo 2024
 * Version corrigée et cohérente pour exploitation
 *
 * CONVENTIONS :
 *  - flatAmount: 0 + description: 'Franco'  → opération gratuite
 *  - flatAmount: N + description: '...'      → montant fixe HT (TAF = 10% en sus si mentionné)
 *  - percentage: P                            → taux appliqué sur le montant (ex: 0.5 = 0,5%)
 *  - value / valueMin / valueMax              → seuils numériques pour ELIGIBILITY et LIMIT
 *  - weight (ELIGIBILITY seulement)          → importance relative dans le scoring (total ~100)
 *  - priority (toutes règles)                 → ordre d'évaluation (1 = prioritaire)
 *  - TBB = Taux de Base Bancaire (variable, non encodé comme valeur fixe)
 *  - MTD = Meilleur Taux Débiteur (= 8% selon document)
 *  - TAF = Taxe sur Activité Financière = 10% sur les commissions HT
 */

import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not defined');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

// ─── Enums locaux ─────────────────────────────────────────────────────────────
const RT = {
  ELIGIBILITY: 'ELIGIBILITY',
  LIMIT: 'LIMIT',
  FEE: 'FEE',
  VALUE_DATE: 'VALUE_DATE',
  INTEREST: 'INTEREST',
} as const;

const RO = {
  GT: 'GREATER_THAN',
  LT: 'LESS_THAN',
  EQ: 'EQUALS',
  GTE: 'GREATER_OR_EQUAL',
  LTE: 'LESS_OR_EQUAL',
  BETWEEN: 'BETWEEN',
  NEQ: 'NOT_EQUALS',
} as const;

const RP = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
  PER_TX: 'PER_TRANSACTION',
} as const;

const CUR = { XOF: 'XOF', EUR: 'EUR', USD: 'USD' } as const;

// ─── Types ────────────────────────────────────────────────────────────────────
type RuleInput = {
  code: string;
  label: string;
  description?: string; // toujours renseigné : "Franco", tarif source, note métier
  type: string;
  field: string;
  operator?: string;
  value?: number;
  valueMin?: number;
  valueMax?: number;
  percentage?: number; // INTEREST / FEE en % (ex: 1.5 pour 1,5%)
  flatAmount?: number; // FEE montant fixe (0 = Franco)
  minAmount?: number; // plancher d'application
  maxAmount?: number;
  currency?: string;
  period?: string;
  weight?: number; // ELIGIBILITY uniquement, total par produit ~100
  priority?: number; // ordre d'évaluation (1 = premier)
  isActive?: boolean;
};

// ─── Helper upsert produit + règles ──────────────────────────────────────────
async function upsertProduct(
  code: string,
  name: string,
  description: string,
  category: string,
  reference: string,
  rules: RuleInput[],
) {
  const product = await prisma.bankProduct.upsert({
    where: { code },
    update: { name, description, category },
    create: { code, name, description, category, reference, isActive: true },
  });

  for (const r of rules) {
    await prisma.rule.upsert({
      where: { productId_code: { productId: product.id, code: r.code } },
      update: {
        label: r.label,
        description: r.description,
        percentage: r.percentage,
        flatAmount: r.flatAmount,
        value: r.value,
        valueMin: r.valueMin,
        valueMax: r.valueMax,
        minAmount: r.minAmount,
        maxAmount: r.maxAmount,
        period: r.period as any,
        weight: r.weight ?? 0,
        priority: r.priority ?? 0,
        isActive: r.isActive ?? true,
      },
      create: {
        productId: product.id,
        code: r.code,
        label: r.label,
        description: r.description,
        type: r.type as any,
        field: r.field,
        operator: r.operator as any,
        value: r.value,
        valueMin: r.valueMin,
        valueMax: r.valueMax,
        percentage: r.percentage,
        flatAmount: r.flatAmount,
        minAmount: r.minAmount,
        maxAmount: r.maxAmount,
        currency: (r.currency ?? CUR.XOF) as any,
        period: r.period as any,
        isActive: r.isActive ?? true,
        weight: r.weight ?? 0,
        priority: r.priority ?? 0,
      },
    });
  }

  return product;
}

// =============================================================================
// SEED
// =============================================================================
async function seed() {
  console.log(
    '🌱  Seeding Orabank Togo — Conditions Générales 2024 (v2 corrigé)\n',
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION A — PARTICULIERS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── A-I : Ouverture / Clôture de compte ───────────────────────────────────
  await upsertProduct(
    'COMPTES_PART',
    'Comptes — Particuliers',
    "Conditions d'ouverture et de clôture de tous types de comptes particuliers (A-I)",
    'ACCOUNT',
    'A-I',
    [
      // ── Ouverture ──────────────────────────────────────────────────────────
      {
        code: 'OUV_CHEQUE',
        label: 'Ouverture compte chèques',
        description: 'Franco (gratuit, avec remise de la convention de compte)',
        type: RT.FEE,
        field: 'ouverture_cheque',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'OUV_EPARGNE',
        label: 'Ouverture compte épargne simple',
        description: 'Franco (gratuit)',
        type: RT.FEE,
        field: 'ouverture_epargne',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'OUV_LIVRET',
        label: 'Ouverture compte sur livret (avec délivrance du livret)',
        description: 'Franco (gratuit)',
        type: RT.FEE,
        field: 'ouverture_livret',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'OUV_CEG',
        label: 'Ouverture Compte Épargne Garantie (CEG)',
        description: 'Franco (gratuit)',
        type: RT.FEE,
        field: 'ouverture_ceg',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'OUV_JOINT_CHEQUE',
        label: 'Ouverture compte joint — chèques',
        description: 'Franco (gratuit)',
        type: RT.FEE,
        field: 'ouverture_joint_cheque',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'OUV_JOINT_EPARGNE',
        label: 'Ouverture compte joint — épargne',
        description: 'Franco (gratuit)',
        type: RT.FEE,
        field: 'ouverture_joint_epargne',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'OUV_INDIVIS_CHEQUE',
        label: 'Ouverture compte indivis — chèques',
        description: 'Franco (gratuit)',
        type: RT.FEE,
        field: 'ouverture_indivis_cheque',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'OUV_INDIVIS_EPARGNE',
        label: 'Ouverture compte indivis — épargne',
        description: 'Franco (gratuit)',
        type: RT.FEE,
        field: 'ouverture_indivis_epargne',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'OUV_PACK_ETUDIANT',
        label: 'Ouverture Pack Étudiant — frais trimestriels',
        description: '1 000 F CFA par trimestre (HT)',
        type: RT.FEE,
        field: 'pack_etudiant',
        flatAmount: 1_000,
        period: RP.MONTHLY,
        // NB: le document dit "1 000/trimestre" — on stocke en mensuel × 3
        // Pour l'exploitation: multiplier par 3 pour obtenir la facturation trimestrielle
        priority: 1,
      },
      {
        code: 'OUV_DEPOT_INITIAL',
        label: "Dépôt initial à l'ouverture de compte",
        description: 'Franco — aucun dépôt initial obligatoire (hors DAT)',
        type: RT.FEE,
        field: 'depot_initial',
        flatAmount: 0,
        priority: 1,
      },
      // ── Éligibilité DAT ────────────────────────────────────────────────────
      {
        code: 'OUV_DAT_DEPOT_MIN',
        label: 'Dépôt à terme — dépôt initial minimum',
        description:
          "Montant minimum d'ouverture d'un DAT : 5 000 000 F CFA (source §1.1.1.3)",
        type: RT.ELIGIBILITY,
        field: 'dat_depot_initial',
        operator: RO.GTE,
        value: 5_000_000,
        weight: 100,
        priority: 1,
      },
      // ── Éligibilité profil financier (scoring interne) ─────────────────────
      {
        code: 'PART_ENDETTEMENT_MAX',
        label: "Taux d'endettement — plafond BCEAO",
        description:
          "Taux d'endettement maximal de 33% des revenus nets, conforme à la règlementation BCEAO. Champ: ratio dette/revenu en pourcentage (ex: 25 pour 25%).",
        type: RT.ELIGIBILITY,
        field: 'debtRatio',
        operator: RO.LT,
        value: 33,
        weight: 35,
        priority: 1,
      },
      {
        code: 'PART_REVENU_MIN',
        label: 'Revenu mensuel net minimum',
        description:
          "Revenu mensuel net minimum de 200 000 F CFA requis pour l'ouverture d'un compte chèques avec chéquier. Champ: revenu mensuel net en F CFA.",
        type: RT.ELIGIBILITY,
        field: 'monthlyIncome',
        operator: RO.GTE,
        value: 200_000,
        weight: 30,
        priority: 2,
      },
      {
        code: 'PART_DECOUVERT_MAX',
        label: 'Jours de découvert chronique — plafond',
        description:
          'Le client ne doit pas avoir été en découvert plus de 15 jours par mois en moyenne sur les 3 derniers mois. Champ: nombre de jours moyen en découvert.',
        type: RT.ELIGIBILITY,
        field: 'overdraftDays',
        operator: RO.LT,
        value: 15,
        weight: 20,
        priority: 3,
      },
      {
        code: 'PART_EPARGNE_MIN',
        label: "Score de régularité d'épargne minimum",
        description:
          "Score interne de régularité d'épargne (0-100). Minimum requis : 40/100. Calculé sur la fréquence et la régularité des versements sur compte épargne.",
        type: RT.ELIGIBILITY,
        field: 'savingsRegularity',
        operator: RO.GTE,
        value: 40,
        weight: 15,
        priority: 4,
      },
      // ── Clôture ────────────────────────────────────────────────────────────
      {
        code: 'CLO_CHEQUE',
        label: 'Clôture compte chèques',
        description: 'Franco (gratuit)',
        type: RT.FEE,
        field: 'cloture_cheque',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'CLO_EPARGNE',
        label: 'Clôture compte épargne simple',
        description: 'Franco (gratuit)',
        type: RT.FEE,
        field: 'cloture_epargne',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'CLO_DAT',
        label: 'Clôture dépôt à terme',
        description: 'Franco (gratuit)',
        type: RT.FEE,
        field: 'cloture_dat',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'CLO_LIVRET',
        label: 'Clôture compte sur livret',
        description: 'Franco (gratuit)',
        type: RT.FEE,
        field: 'cloture_livret',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'CLO_JOINT',
        label: 'Clôture compte joint',
        description: 'Franco (gratuit)',
        type: RT.FEE,
        field: 'cloture_joint',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'CLO_INDIVIS',
        label: 'Clôture compte indivis',
        description: 'Franco (gratuit)',
        type: RT.FEE,
        field: 'cloture_indivis',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'CLO_LETTRE_JURIDIQUE',
        label: 'Lettre de clôture juridique',
        description:
          'Franco (gratuit) — courrier officiel de clôture adressé au client',
        type: RT.FEE,
        field: 'lettre_cloture_juridique',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'CLO_ATTESTATION',
        label: 'Attestation de clôture de compte',
        description: 'Franco (gratuit)',
        type: RT.FEE,
        field: 'attestation_cloture',
        flatAmount: 0,
        priority: 1,
      },
    ],
  );

  // ── A-II : Gestion de compte — Particuliers ────────────────────────────────
  await upsertProduct(
    'GESTION_COMPTE_PART',
    'Gestion de compte — Particuliers',
    'Conditions débitrices/créditrices, relevés, attestations pour comptes particuliers (A-II §2.1)',
    'ACCOUNT',
    'A-II-2.1',
    [
      // ── Conditions débitrices ──────────────────────────────────────────────
      {
        code: 'TAUX_DEBITEUR_MTD',
        label: 'Meilleur taux débiteur (MTD) appliqué à la clientèle',
        description:
          "8% l'an + TAF. C'est le MTD de référence utilisé comme base pour le calcul des autres taux (découverts, crédits). Taux annuel HT.",
        type: RT.INTEREST,
        field: 'taux_debiteur_annuel',
        percentage: 8,
        period: RP.YEARLY,
        priority: 1,
      },
      {
        code: 'FRAIS_TENUE_LIVRET',
        label: "Frais de tenue de compte sur livret d'épargne",
        description: 'Franco (gratuit)',
        type: RT.FEE,
        field: 'frais_tenue_livret',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'COM_PLUS_FORT_DECOUVERT',
        label: 'Commission de plus fort découvert (mensuelle)',
        description:
          '0,05% du plus fort découvert du mois + TAF, avec minimum de 500 F CFA + TAF. Prélevée mensuellement.',
        type: RT.FEE,
        field: 'com_plus_fort_decouvert',
        percentage: 0.05,
        minAmount: 500,
        period: RP.MONTHLY,
        priority: 2,
      },
      {
        code: 'COM_MVT_DEBIT_CHEQUIER',
        label: 'Commission mouvement débit — avec chéquier',
        description:
          "Franco (gratuit) — exonéré pour les clients détenteurs d'un chéquier",
        type: RT.FEE,
        field: 'com_mvt_debit_chequier',
        flatAmount: 0,
        priority: 2,
      },
      {
        code: 'COM_MVT_DEBIT_GUICHET',
        label: 'Commission mouvement débit — chèque de guichet',
        description:
          '1 000 F CFA + TAF par opération de retrait sur chèque de guichet (sans chéquier)',
        type: RT.FEE,
        field: 'com_mvt_debit_guichet',
        flatAmount: 1_000,
        priority: 2,
      },
      {
        code: 'COM_MVT_DEBIT_TIRAGE',
        label: 'Commission mouvement — paiement chèque tirage correspondant',
        description:
          'Franco (gratuit) — paiement de chèques tirés sur la banque correspondante',
        type: RT.FEE,
        field: 'com_mvt_debit_tirage',
        flatAmount: 0,
        priority: 2,
      },
      {
        code: 'COM_DEPASSEMENT_AUTORISE',
        label: 'Commission de dépassement — compte autorisé',
        description:
          '0,5% Flat du montant du dépassement + TAF. Appliquée quand le client dépasse le plafond de découvert autorisé.',
        type: RT.FEE,
        field: 'com_depassement_autorise',
        percentage: 0.5,
        priority: 2,
      },
      {
        code: 'COM_DEPASSEMENT_NON_AUTORISE',
        label: 'Commission de dépassement — compte non autorisé',
        description:
          '0,5% du montant du dépassement + TAF. Appliquée sur tout débit entraînant un solde débiteur non autorisé.',
        type: RT.FEE,
        field: 'com_depassement_non_autorise',
        percentage: 0.5,
        priority: 2,
      },
      {
        code: 'FRAIS_TENUE_COMPTE_MENSUEL',
        label: 'Frais de tenue de compte chèques particulier (mensuel)',
        description:
          '1 000 F CFA + TAF par mois. Prélevés mensuellement sur le compte chèques.',
        type: RT.FEE,
        field: 'frais_tenue_compte_mensuel',
        flatAmount: 1_000,
        period: RP.MONTHLY,
        priority: 1,
      },
      {
        code: 'ARRETE_COMPTE_MENSUEL',
        label: 'Arrêté de compte mensuel',
        description:
          'Franco (gratuit) — document de synthèse mensuel des opérations',
        type: RT.FEE,
        field: 'arrete_compte_mensuel',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'RIB',
        label: "Relevé d'Identité Bancaire (RIB)",
        description: 'Franco (gratuit) — délivrance du RIB sur demande',
        type: RT.FEE,
        field: 'rib',
        flatAmount: 0,
        priority: 1,
      },
      // ── Relevés de compte ──────────────────────────────────────────────────
      {
        code: 'RELEVE_MENSUEL',
        label: 'Relevé de compte mensuel',
        description:
          'Franco (gratuit) — relevé mensuel standard envoyé automatiquement',
        type: RT.FEE,
        field: 'releve_mensuel',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'RELEVE_DEMANDE_INF_1AN',
        label: 'Relevé à la demande — période inférieure à 1 an',
        description:
          '5 000 F CFA + TAF par relevé demandé pour la période en cours ou les 12 derniers mois',
        type: RT.FEE,
        field: 'releve_demande_inf_1an',
        flatAmount: 5_000,
        priority: 2,
      },
      {
        code: 'RELEVE_DEMANDE_SUP_1AN',
        label:
          'Relevé à la demande — période supérieure à 1 an (tarif par année)',
        description:
          "6 000 F CFA × nombre d'années + TAF. Ex: relevé sur 3 ans = 18 000 + TAF.",
        type: RT.FEE,
        field: 'releve_demande_sup_1an',
        flatAmount: 6_000,
        priority: 2,
        // NB: flatAmount représente le tarif PAR ANNÉE. Multiplier par nb d'années à l'application.
      },
      {
        code: 'RELEVE_FRAIS_ANNUELS',
        label: 'Relevé récapitulatif annuel des frais',
        description:
          'Franco (gratuit) — relevé annuel obligatoire des frais prélevés, envoyé automatiquement',
        type: RT.FEE,
        field: 'releve_frais_annuels',
        flatAmount: 0,
        priority: 1,
      },
      // ── Attestations ───────────────────────────────────────────────────────
      {
        code: 'ATTEST_SOLDE',
        label: 'Attestation de solde',
        description:
          '30 000 F CFA (HT, TAF non applicable sur ce montant selon tarifs en vigueur). Document certifiant le solde du compte à une date donnée.',
        type: RT.FEE,
        field: 'attestation_solde',
        flatAmount: 30_000,
        priority: 2,
      },
      {
        code: 'ATTEST_NON_ENGAGEMENT',
        label: 'Attestation de non-engagement',
        description:
          "100 000 F CFA + TAF. Certifie que le client ne dispose d'aucun engagement (crédit, caution) en cours auprès de la banque.",
        type: RT.FEE,
        field: 'attestation_non_engagement',
        flatAmount: 100_000,
        priority: 2,
      },
      {
        code: 'ATTEST_ENGAGEMENT',
        label: "Attestation d'engagement",
        description:
          '60 000 F CFA + TAF. Certifie la nature et le montant des engagements en cours du client.',
        type: RT.FEE,
        field: 'attestation_engagement',
        flatAmount: 60_000,
        priority: 2,
      },
      {
        code: 'ATTEST_DEDUCTIBILITE',
        label: 'Attestation de déductibilité fiscale',
        description:
          '25 000 F CFA + TAF. Document fiscal certifiant les intérêts déductibles payés (ex: prêt immobilier).',
        type: RT.FEE,
        field: 'attestation_deductibilite',
        flatAmount: 25_000,
        priority: 2,
      },
      {
        code: 'ATTEST_COMPTE',
        label: 'Attestation de compte',
        description:
          "30 000 F CFA + TAF. Certifie l'existence et l'état d'un compte bancaire (souvent requis pour visa, appel d'offre, etc.).",
        type: RT.FEE,
        field: 'attestation_compte',
        flatAmount: 30_000,
        priority: 2,
      },
      {
        code: 'ATTEST_CAUTION_SOLIDAIRE',
        label: 'Attestation de caution solidaire',
        description:
          "30 000 F CFA + TAF. Certifie l'engagement de caution solidaire d'un tiers.",
        type: RT.FEE,
        field: 'attestation_caution_solidaire',
        flatAmount: 30_000,
        priority: 2,
      },
      {
        code: 'ATTEST_SOLDE_ANTICIPATION',
        label: 'Attestation de solde par anticipation',
        description:
          'Franco (gratuit) — produit spécifique, solde prévisionnel certifié',
        type: RT.FEE,
        field: 'attestation_solde_anticipation',
        flatAmount: 0,
        priority: 2,
      },
      // ── Divers ─────────────────────────────────────────────────────────────
      {
        code: 'FRAIS_TIMBRE_VERSEMENT',
        label: "Frais de timbre fiscal pour versement d'espèces",
        description:
          "100 F CFA par opération de versement d'espèces en compte (timbre fiscal, reversé au Trésor)",
        type: RT.FEE,
        field: 'frais_timbre_versement',
        flatAmount: 100,
        priority: 3,
      },
      {
        code: 'FRAIS_PROCURATION',
        label: 'Frais pour procuration sur compte',
        description:
          "Franco (gratuit) — mise en place d'une procuration au profit d'un mandataire",
        type: RT.FEE,
        field: 'frais_procuration',
        flatAmount: 0,
        priority: 3,
      },
      // ── Conditions créditrices ─────────────────────────────────────────────
      {
        code: 'TAUX_EPARGNE_SIMPLE',
        label: 'Taux créditeur compte épargne simple',
        description:
          "3,5% l'an, sans taxe sur les intérêts jusqu'à 10 000 000 F CFA de capital. Au-delà, taux négocié.",
        type: RT.INTEREST,
        field: 'taux_epargne_simple',
        percentage: 3.5,
        period: RP.YEARLY,
        priority: 1,
      },
      {
        code: 'TAUX_EPARGNE_CONTRAT_BONUS',
        label: 'Taux créditeur compte épargne contrat bonus',
        description:
          "4,5% l'an. Produit d'épargne contractuelle avec versements réguliers et prime de fidélité.",
        type: RT.INTEREST,
        field: 'taux_epargne_contrat_bonus',
        percentage: 4.5,
        period: RP.YEARLY,
        priority: 1,
      },
      {
        code: 'TAUX_CEG',
        label: 'Taux créditeur Compte Épargne Garantie (CEG)',
        description:
          "3,75% l'an. Compte épargne avec capital garanti par la banque.",
        type: RT.INTEREST,
        field: 'taux_ceg',
        percentage: 3.75,
        period: RP.YEARLY,
        priority: 1,
      },
      {
        code: 'TAUX_PLANS_EPARGNE',
        label: "Taux créditeur plans d'épargne contractuelle",
        description:
          "4,5% l'an pour les plans d'épargne logement, épargne actions et produits contractuels.",
        type: RT.INTEREST,
        field: 'taux_plans_epargne',
        percentage: 4.5,
        period: RP.YEARLY,
        priority: 1,
      },
      // ── DAT : Dépôt à terme ────────────────────────────────────────────────
      {
        code: 'DAT_MONTANT_MIN',
        label: 'Dépôt à terme — montant minimum requis',
        description:
          '5 000 000 F CFA minimum. Durée minimum 3 mois. Taux selon grille DAT en vigueur (non fixé dans les CG).',
        type: RT.ELIGIBILITY,
        field: 'dat_montant',
        operator: RO.GTE,
        value: 5_000_000,
        weight: 60,
        priority: 1,
      },
      {
        code: 'DAT_DUREE_MIN_MOIS',
        label: 'Dépôt à terme — durée minimale (mois)',
        description:
          "Durée minimum de 3 mois. En dessous, le DAT n'est pas ouvert.",
        type: RT.ELIGIBILITY,
        field: 'dat_duree_mois',
        operator: RO.GTE,
        value: 3,
        weight: 40,
        priority: 2,
      },
      // ── Bon de caisse ──────────────────────────────────────────────────────
      {
        code: 'BON_CAISSE_DUREE_MIN',
        label: 'Bon de caisse — durée minimale (mois)',
        description: "Durée minimum de 6 mois. Taux d'intérêt : 2% l'an.",
        type: RT.ELIGIBILITY,
        field: 'bon_caisse_duree_mois',
        operator: RO.GTE,
        value: 6,
        weight: 100,
        priority: 1,
      },
      {
        code: 'BON_CAISSE_TAUX',
        label: "Bon de caisse — taux d'intérêt annuel",
        description:
          "2% l'an. Titre de créance négociable émis par la banque pour une durée minimum de 6 mois.",
        type: RT.INTEREST,
        field: 'taux_bon_caisse',
        percentage: 2,
        period: RP.YEARLY,
        priority: 1,
      },
      // ── Date de valeur créditrices ─────────────────────────────────────────
      {
        code: 'DATE_VALEUR_CREDITRICE',
        label: 'Date de valeur — conditions créditrices',
        description:
          'J+1 : les montants versés (hors espèces) sont crédités avec une date de valeur au lendemain ouvré.',
        type: RT.VALUE_DATE,
        field: 'date_valeur_creditrice',
        value: 1,
        priority: 1,
      },
    ],
  );

  // ── A-II §2.2.1 : Chèques — Particuliers ─────────────────────────────────
  await upsertProduct(
    'CHEQUES_PART',
    'Chèques — Particuliers',
    'Délivrance, certification, opposition, rejet et encaissement de chèques particuliers (A-II §2.2.1)',
    'PAYMENT',
    'A-II-2.2.1',
    [
      {
        code: 'CHQ_BARRES',
        label: 'Chèques barrés non endossables (chéquier standard)',
        description:
          'Franco (gratuit) — délivrance du chéquier standard à barrement général',
        type: RT.FEE,
        field: 'cheque_barre',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'CHQ_NON_BARRE',
        label: 'Chèques non barrés / vignette',
        description:
          '25 F CFA par feuillet. Chèque non barré endossable (vignette fiscale incluse).',
        type: RT.FEE,
        field: 'cheque_non_barre',
        flatAmount: 25,
        priority: 1,
        // NB: flatAmount = coût PAR feuillet. Multiplier par le nombre de feuillets.
      },
      {
        code: 'CHQ_LETTRE',
        label: 'Lettre-chèques',
        description:
          "Au prix de revient — facturation au coût réel d'impression et d'envoi",
        type: RT.FEE,
        field: 'lettre_cheque',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'CHQ_BANQUE_PLACE',
        label: 'Chèque de banque sur place',
        description:
          '5 000 F CFA + TAF. Chèque émis par la banque sur elle-même, payable dans la même place bancaire.',
        type: RT.FEE,
        field: 'cheque_banque_place',
        flatAmount: 5_000,
        priority: 1,
      },
      {
        code: 'CHQ_BANQUE_UEMOA',
        label: 'Chèque de banque UEMOA',
        description:
          '5 000 F CFA + TAF. Chèque de banque payable dans la zone UEMOA.',
        type: RT.FEE,
        field: 'cheque_banque_uemoa',
        flatAmount: 5_000,
        priority: 1,
      },
      {
        code: 'CHQ_GUICHET',
        label: 'Chèque de guichet (retrait sans chéquier)',
        description:
          '1 000 F CFA + TAF. Chèque délivré au guichet pour un retrait ponctuel sans chéquier.',
        type: RT.FEE,
        field: 'cheque_guichet',
        flatAmount: 1_000,
        priority: 1,
      },
      {
        code: 'CHQ_CERTIFICATION',
        label: 'Certification de chèque',
        description:
          '5 000 F CFA + TAF. La banque certifie la provision du chèque et la bloque pendant 8 jours.',
        type: RT.FEE,
        field: 'certification_cheque',
        flatAmount: 5_000,
        priority: 2,
      },
      {
        code: 'CHQ_ANNULATION_BANQUE',
        label: 'Annulation de chèque de banque',
        description: 'Franco (gratuit)',
        type: RT.FEE,
        field: 'annulation_cheque_banque',
        flatAmount: 0,
        priority: 2,
      },
      {
        code: 'CHQ_OPPOSITION',
        label: "Opposition sur chèque ou chéquier par l'émetteur",
        description:
          '10 000 F CFA + TAF. Mise en opposition suite à perte, vol ou utilisation frauduleuse.',
        type: RT.FEE,
        field: 'opposition_cheque',
        flatAmount: 10_000,
        priority: 1,
      },
      {
        code: 'CHQ_OPPOSITION_RENOUV',
        label: "Renouvellement d'opposition sur chèque/chéquier",
        description:
          "Franco (gratuit) — renouvellement annuel de l'opposition déjà enregistrée",
        type: RT.FEE,
        field: 'renouvellement_opposition',
        flatAmount: 0,
        priority: 2,
      },
      {
        code: 'CHQ_DESTRUCTION_25',
        label: 'Frais de destruction de chéquier 25 feuillets',
        description:
          '2 000 F CFA + TAF par chéquier de 25 feuillets détruit à la demande du client.',
        type: RT.FEE,
        field: 'destruction_chequier_25',
        flatAmount: 2_000,
        priority: 3,
      },
      {
        code: 'CHQ_DESTRUCTION_50',
        label: 'Frais de destruction de chéquier 50 feuillets',
        description:
          '3 000 F CFA + TAF par chéquier de 50 feuillets détruit à la demande du client.',
        type: RT.FEE,
        field: 'destruction_chequier_50',
        flatAmount: 3_000,
        priority: 3,
      },
      {
        code: 'CHQ_REJET_IMPAYE',
        label: 'Rejet de chèque impayé (absence ou insuffisance de provision)',
        description:
          "7 000 F CFA + TAF par chèque rejeté. Si lettre d'injonction associée : 7 500 F CFA + TAF.",
        type: RT.FEE,
        field: 'rejet_cheque_impaye',
        flatAmount: 7_000,
        priority: 1,
      },
      {
        code: 'CHQ_LETTRE_INJONCTION',
        label: "Lettre d'injonction sur rejet de chèque impayé",
        description:
          "7 500 F CFA + TAF. Lettre réglementaire envoyée au tireur suite à un chèque impayé. S'ajoute aux frais de rejet.",
        type: RT.FEE,
        field: 'lettre_injonction_cheque',
        flatAmount: 7_500,
        priority: 1,
      },
      {
        code: 'CHQ_EXPEDITION_SIMPLE',
        label: 'Expédition de chéquier à domicile — pli simple',
        description:
          '1 000 F CFA + TAF + tarif courrier en vigueur. Envoi postal standard.',
        type: RT.FEE,
        field: 'expedition_chequier_simple',
        flatAmount: 1_000,
        priority: 3,
      },
      {
        code: 'CHQ_EXPEDITION_RECOMM',
        label: 'Expédition de chéquier à domicile — pli recommandé',
        description:
          "5 000 F CFA + frais réels d'envoi recommandé. Pour envoi à l'étranger ou sur demande spécifique.",
        type: RT.FEE,
        field: 'expedition_chequier_recomm',
        flatAmount: 5_000,
        priority: 3,
      },
      {
        code: 'CHQ_ENCAISSEMENT_UEMOA',
        label: "Encaissement de chèques dans l'UEMOA",
        description:
          "Franco (gratuit). Date de valeur J+2. En cas d'impayé : 7 000 F CFA par chèque retourné.",
        type: RT.FEE,
        field: 'encaissement_cheque_uemoa',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'CHQ_ENCAISSEMENT_HORS_UEMOA',
        label: 'Encaissement de chèques hors UEMOA',
        description:
          "Date de valeur : 45 jours. En cas d'impayé : 7 000 F CFA + TAF + récupération des frais d'envoi et frais correspondant.",
        type: RT.FEE,
        field: 'encaissement_cheque_hors_uemoa',
        flatAmount: 7_000,
        priority: 1,
        // NB: flatAmount = frais d'impayé uniquement. L'encaissement lui-même est gratuit.
      },
    ],
  );

  // ── A-II §2.2.2 : Cartes Visa — Particuliers ─────────────────────────────
  // Carte Visa Prépayée Liberté
  await upsertProduct(
    'VISA_LIBERTE',
    'Carte Visa Prépayée Liberté',
    'Carte Visa prépayée — entrée de gamme particuliers. Rechargeable, sans compte courant obligatoire. (A-II §2.2.2.1.5.1)',
    'CARD',
    'A-II-2.2.2.1.5.1',
    [
      {
        code: 'VL_ACQUISITION',
        label: "Frais d'acquisition (ouverture)",
        description:
          '12 000 F CFA HT — frais uniques à la délivrance de la carte',
        type: RT.FEE,
        field: 'frais_acquisition',
        flatAmount: 12_000,
        priority: 1,
      },
      {
        code: 'VL_RECHARGE_MIN',
        label: 'Montant minimum du premier rechargement',
        description:
          '25 000 F CFA minimum requis pour activer la carte au premier chargement.',
        type: RT.ELIGIBILITY,
        field: 'recharge_initiale',
        operator: RO.GTE,
        value: 25_000,
        weight: 100,
        priority: 1,
      },
      // ── Éligibilité profil financier ───────────────────────────────────────
      {
        code: 'VL_ENDETTEMENT_MAX',
        label: "Taux d'endettement — plafond BCEAO",
        description:
          "Taux d'endettement < 33% des revenus nets. Champ: ratio dette/revenu en pourcentage.",
        type: RT.ELIGIBILITY,
        field: 'debtRatio',
        operator: RO.LT,
        value: 33,
        weight: 35,
        priority: 1,
      },
      {
        code: 'VL_REVENU_MIN',
        label: 'Revenu mensuel net minimum',
        description:
          '100 000 F CFA minimum (seuil allégé pour carte prépayée vs compte chèques). Champ: revenu mensuel net en F CFA.',
        type: RT.ELIGIBILITY,
        field: 'monthlyIncome',
        operator: RO.GTE,
        value: 100_000,
        weight: 30,
        priority: 2,
      },
      {
        code: 'VL_DECOUVERT_MAX',
        label: 'Jours de découvert chronique — plafond',
        description:
          'Maximum 20 jours/mois en découvert (seuil plus souple que compte chèques). Champ: nombre de jours moyen.',
        type: RT.ELIGIBILITY,
        field: 'overdraftDays',
        operator: RO.LT,
        value: 20,
        weight: 20,
        priority: 3,
      },
      {
        code: 'VL_REGULARITE_EPARGNE',
        label: "Score de régularité d'épargne",
        description:
          'Score minimum 30/100 (seuil allégé pour carte prépayée). Champ: score 0-100.',
        type: RT.ELIGIBILITY,
        field: 'savingsRegularity',
        operator: RO.GTE,
        value: 30,
        weight: 15,
        priority: 4,
      },
      // ── Limites ────────────────────────────────────────────────────────────
      {
        code: 'VL_RETRAIT_MIN_JOUR',
        label: 'Montant minimum de retrait par opération/jour',
        description: '5 000 F CFA minimum par retrait au GAB.',
        type: RT.LIMIT,
        field: 'retrait_min_jour',
        operator: RO.GTE,
        value: 5_000,
        priority: 1,
      },
      {
        code: 'VL_CHARGEMENT_MAX',
        label: 'Montant maximum de chargement (solde max)',
        description: '2 000 000 F CFA maximum sur la carte à tout moment.',
        type: RT.LIMIT,
        field: 'chargement_max',
        operator: RO.LTE,
        value: 2_000_000,
        priority: 1,
      },
      {
        code: 'VL_RETRAIT_GAB_MAX_JOUR',
        label: 'Montant maximum retrait GAB par jour',
        description: '1 000 000 F CFA par jour au Guichet Automatique.',
        type: RT.LIMIT,
        field: 'retrait_gab_max_jour',
        operator: RO.LTE,
        value: 1_000_000,
        priority: 1,
      },
      {
        code: 'VL_PAIEMENT_TPE_MAX_JOUR',
        label: 'Montant maximum paiement TPE par jour',
        description:
          '2 000 000 F CFA par jour en paiement commerçant (Terminal de Paiement Électronique).',
        type: RT.LIMIT,
        field: 'paiement_tpe_max_jour',
        operator: RO.LTE,
        value: 2_000_000,
        priority: 1,
      },
      {
        code: 'VL_NB_TX_JOUR',
        label: 'Nombre maximum de transactions journalières',
        description: '10 transactions maximum par jour (GAB + TPE cumulés).',
        type: RT.LIMIT,
        field: 'nb_transactions_jour',
        operator: RO.LTE,
        value: 10,
        priority: 1,
      },
      {
        code: 'VL_SOLDE_MAX',
        label: 'Solde maximum de la carte',
        description: '2 000 000 F CFA — plafond de solde chargé sur la carte.',
        type: RT.LIMIT,
        field: 'solde_max_carte',
        operator: RO.LTE,
        value: 2_000_000,
        priority: 1,
      },
      {
        code: 'VL_VALIDITE_ANS',
        label: 'Durée de validité de la carte',
        description: "3 ans à compter de la date d'émission.",
        type: RT.LIMIT,
        field: 'validite_annees',
        value: 3,
        priority: 1,
      },
      // ── Frais ──────────────────────────────────────────────────────────────
      {
        code: 'VL_FRAIS_CHARGEMENT',
        label: 'Frais de chargement de la carte',
        description:
          '1,5% du montant chargé + TAF, minimum 1 000 F CFA + TAF par opération de rechargement.',
        type: RT.FEE,
        field: 'frais_chargement',
        percentage: 1.5,
        minAmount: 1_000,
        priority: 1,
      },
      {
        code: 'VL_FRAIS_TRANSFERT_CARTE',
        label: 'Frais de transfert de carte à carte',
        description:
          '1,5% du montant transféré + TAF, minimum 1 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'frais_transfert_carte_a_carte',
        percentage: 1.5,
        minAmount: 1_000,
        priority: 2,
      },
      {
        code: 'VL_RETRAIT_DAB_ORABANK',
        label: 'Retrait au DAB Orabank',
        description:
          'Franco (gratuit) — retrait aux guichets automatiques du réseau Orabank',
        type: RT.FEE,
        field: 'retrait_dab_orabank',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'VL_RETRAIT_DAB_GIM',
        label: 'Retrait au DAB GIM-UEMOA (autres banques UEMOA)',
        description:
          '500 F CFA par retrait aux guichets des banques confrères GIM-UEMOA.',
        type: RT.FEE,
        field: 'retrait_dab_gim_uemoa',
        flatAmount: 500,
        priority: 1,
      },
      {
        code: 'VL_RETRAIT_DAB_HORS_PAYS',
        label: 'Retrait au DAB hors pays (hors UEMOA)',
        description:
          '2% du montant retiré + TAF. Applicable pour tout retrait hors du Togo et de la zone UEMOA.',
        type: RT.FEE,
        field: 'retrait_dab_hors_pays',
        percentage: 2,
        priority: 1,
      },
      {
        code: 'VL_RENOUVELLEMENT',
        label: 'Renouvellement de la carte',
        description: "12 000 F CFA à l'échéance des 3 ans ou sur demande.",
        type: RT.FEE,
        field: 'renouvellement_carte',
        flatAmount: 12_000,
        priority: 2,
      },
      {
        code: 'VL_ANNULATION',
        label: 'Annulation de la carte',
        description: '10 000 F CFA — frais de clôture anticipée de la carte.',
        type: RT.FEE,
        field: 'annulation_carte',
        flatAmount: 10_000,
        priority: 2,
      },
      {
        code: 'VL_REFECTION',
        label: 'Réfection de la carte (hors défectuosité)',
        description:
          '12 000 F CFA — remplacement de la carte en cas de perte, détérioration ou vol retrouvé.',
        type: RT.FEE,
        field: 'refection_carte',
        flatAmount: 12_000,
        priority: 2,
      },
      {
        code: 'VL_REEDITION_CODE',
        label: 'Réédition du code confidentiel (PIN)',
        description: '2 000 F CFA + TAF par réédition de code PIN.',
        type: RT.FEE,
        field: 'reedition_code_pin',
        flatAmount: 2_000,
        priority: 3,
      },
      {
        code: 'VL_OPPOSITION',
        label: 'Opposition sur carte (perte/vol)',
        description:
          '2 000 F CFA + TAF. Mise en opposition sur déclaration de perte ou vol par le client.',
        type: RT.FEE,
        field: 'opposition_carte',
        flatAmount: 2_000,
        priority: 1,
      },
      {
        code: 'VL_COMMANDE_EXPRESS',
        label: 'Commande express de la carte',
        description:
          '25 000 F CFA — fabrication et délivrance accélérée de la carte.',
        type: RT.FEE,
        field: 'commande_express',
        flatAmount: 25_000,
        priority: 3,
      },
      {
        code: 'VL_LIVRAISON_DHL',
        label: 'Livraison de la carte par DHL',
        description:
          '25 000 F CFA — expédition express de la carte par coursier international DHL.',
        type: RT.FEE,
        field: 'livraison_dhl',
        flatAmount: 25_000,
        priority: 3,
      },
      {
        code: 'VL_RELEVEMENT_PLAFOND',
        label: 'Relèvement du plafond de la carte',
        description:
          'Franco (gratuit) — modification temporaire ou définitive du plafond sur autorisation.',
        type: RT.FEE,
        field: 'relevement_plafond',
        flatAmount: 0,
        priority: 3,
      },
    ],
  );

  // Carte Visa Classic
  await upsertProduct(
    'VISA_CLASSIC',
    'Carte Visa Classic',
    'Carte Visa Classic débitée sur compte chèques — gamme standard particuliers (A-II §2.2.2.1.5.2)',
    'CARD',
    'A-II-2.2.2.1.5.2',
    [
      {
        code: 'VC_ABONNEMENT',
        label: "Frais d'abonnement et de gestion mensuel",
        description:
          '2 000 F CFA par mois. Prélevés mensuellement sur le compte associé.',
        type: RT.FEE,
        field: 'frais_abonnement_mensuel',
        flatAmount: 2_000,
        period: RP.MONTHLY,
        priority: 1,
      },
      {
        code: 'VC_RETRAIT_GAB_MAX_JOUR',
        label: 'Montant maximum retrait GAB par jour',
        description: '500 000 F CFA par jour au Guichet Automatique.',
        type: RT.LIMIT,
        field: 'retrait_gab_max_jour',
        operator: RO.LTE,
        value: 500_000,
        priority: 1,
      },
      {
        code: 'VC_PAIEMENT_TPE_MAX_JOUR',
        label: 'Montant maximum paiement TPE par jour',
        description: '1 000 000 F CFA par jour en paiement commerçant.',
        type: RT.LIMIT,
        field: 'paiement_tpe_max_jour',
        operator: RO.LTE,
        value: 1_000_000,
        priority: 1,
      },
      {
        code: 'VC_NB_TX_JOUR',
        label: 'Nombre maximum de transactions journalières',
        description: '10 transactions maximum par jour.',
        type: RT.LIMIT,
        field: 'nb_transactions_jour',
        operator: RO.LTE,
        value: 10,
        priority: 1,
      },
      {
        code: 'VC_VALIDITE_ANS',
        label: 'Durée de validité de la carte',
        description: "3 ans à compter de la date d'émission.",
        type: RT.LIMIT,
        field: 'validite_annees',
        value: 3,
        priority: 1,
      },
      {
        code: 'VC_RETRAIT_DAB_ORABANK',
        label: 'Retrait au DAB Orabank',
        description: 'Franco (gratuit)',
        type: RT.FEE,
        field: 'retrait_dab_orabank',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'VC_RETRAIT_DAB_GIM',
        label: 'Retrait au DAB GIM-UEMOA',
        description: '500 F CFA par retrait.',
        type: RT.FEE,
        field: 'retrait_dab_gim_uemoa',
        flatAmount: 500,
        priority: 1,
      },
      {
        code: 'VC_RETRAIT_DAB_HORS_PAYS',
        label: 'Retrait au DAB hors pays',
        description: '2% du montant + TAF.',
        type: RT.FEE,
        field: 'retrait_dab_hors_pays',
        percentage: 2,
        priority: 1,
      },
      {
        code: 'VC_ANNULATION',
        label: 'Annulation de la carte',
        description: '10 000 F CFA.',
        type: RT.FEE,
        field: 'annulation_carte',
        flatAmount: 10_000,
        priority: 2,
      },
      {
        code: 'VC_REFECTION',
        label: 'Réfection de la carte',
        description: '12 000 F CFA (hors défectuosité imputable à la banque).',
        type: RT.FEE,
        field: 'refection_carte',
        flatAmount: 12_000,
        priority: 2,
      },
      {
        code: 'VC_REEDITION_CODE',
        label: 'Réédition du code PIN',
        description: '2 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'reedition_code_pin',
        flatAmount: 2_000,
        priority: 3,
      },
      {
        code: 'VC_OPPOSITION',
        label: 'Opposition sur carte',
        description: '2 000 F CFA + TAF (perte/vol déclaré par le client).',
        type: RT.FEE,
        field: 'opposition_carte',
        flatAmount: 2_000,
        priority: 1,
      },
      {
        code: 'VC_RELEVEMENT_1MOIS',
        label: 'Relèvement du plafond — durée 1 mois',
        description: "5 000 F CFA pour un relèvement temporaire d'un mois.",
        type: RT.FEE,
        field: 'relevement_plafond_1mois',
        flatAmount: 5_000,
        priority: 3,
      },
      {
        code: 'VC_RELEVEMENT_INDEF',
        label: 'Relèvement du plafond — durée indéterminée',
        description: '15 000 F CFA pour un relèvement permanent du plafond.',
        type: RT.FEE,
        field: 'relevement_plafond_indefini',
        flatAmount: 15_000,
        priority: 3,
      },
      {
        code: 'VC_COMMANDE_EXPRESS',
        label: 'Commande express',
        description: '25 000 F CFA.',
        type: RT.FEE,
        field: 'commande_express',
        flatAmount: 25_000,
        priority: 3,
      },
      {
        code: 'VC_LIVRAISON_DHL',
        label: 'Livraison DHL',
        description: '25 000 F CFA.',
        type: RT.FEE,
        field: 'livraison_dhl',
        flatAmount: 25_000,
        priority: 3,
      },
    ],
  );

  // Carte Visa Premier
  await upsertProduct(
    'VISA_PREMIER',
    'Carte Visa Premier',
    'Carte Visa Premier — gamme premium particuliers avec plafonds élevés (A-II §2.2.2.1.5.3)',
    'CARD',
    'A-II-2.2.2.1.5.3',
    [
      {
        code: 'VP_ABONNEMENT',
        label: "Frais d'abonnement mensuel",
        description: '7 500 F CFA par mois.',
        type: RT.FEE,
        field: 'frais_abonnement_mensuel',
        flatAmount: 7_500,
        period: RP.MONTHLY,
        priority: 1,
      },
      {
        code: 'VP_RETRAIT_GAB_MAX_JOUR',
        label: 'Montant maximum retrait GAB par jour',
        description: '1 000 000 F CFA par jour.',
        type: RT.LIMIT,
        field: 'retrait_gab_max_jour',
        operator: RO.LTE,
        value: 1_000_000,
        priority: 1,
      },
      {
        code: 'VP_PAIEMENT_TPE_MAX_JOUR',
        label: 'Montant maximum paiement TPE par jour',
        description: '2 000 000 F CFA par jour.',
        type: RT.LIMIT,
        field: 'paiement_tpe_max_jour',
        operator: RO.LTE,
        value: 2_000_000,
        priority: 1,
      },
      {
        code: 'VP_NB_TX_JOUR',
        label: 'Nombre maximum de transactions journalières',
        description: '10 transactions maximum par jour.',
        type: RT.LIMIT,
        field: 'nb_transactions_jour',
        operator: RO.LTE,
        value: 10,
        priority: 1,
      },
      {
        code: 'VP_VALIDITE_ANS',
        label: 'Durée de validité de la carte',
        description: '3 ans.',
        type: RT.LIMIT,
        field: 'validite_annees',
        value: 3,
        priority: 1,
      },
      {
        code: 'VP_RETRAIT_DAB_ORABANK',
        label: 'Retrait au DAB Orabank',
        description: 'Franco (gratuit).',
        type: RT.FEE,
        field: 'retrait_dab_orabank',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'VP_RETRAIT_DAB_GIM',
        label: 'Retrait au DAB GIM-UEMOA',
        description: '500 F CFA par retrait.',
        type: RT.FEE,
        field: 'retrait_dab_gim_uemoa',
        flatAmount: 500,
        priority: 1,
      },
      {
        code: 'VP_RETRAIT_DAB_HORS_PAYS',
        label: 'Retrait au DAB hors pays',
        description: '2% du montant + TAF.',
        type: RT.FEE,
        field: 'retrait_dab_hors_pays',
        percentage: 2,
        priority: 1,
      },
      {
        code: 'VP_ANNULATION',
        label: 'Annulation de la carte',
        description: '10 000 F CFA.',
        type: RT.FEE,
        field: 'annulation_carte',
        flatAmount: 10_000,
        priority: 2,
      },
      {
        code: 'VP_REFECTION',
        label: 'Réfection de la carte',
        description: '12 000 F CFA.',
        type: RT.FEE,
        field: 'refection_carte',
        flatAmount: 12_000,
        priority: 2,
      },
      {
        code: 'VP_REEDITION_CODE',
        label: 'Réédition du code PIN',
        description: '2 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'reedition_code_pin',
        flatAmount: 2_000,
        priority: 3,
      },
      {
        code: 'VP_OPPOSITION',
        label: 'Opposition sur carte',
        description:
          '5 000 F CFA + TAF (tarif supérieur à la Classic, gamme premium).',
        type: RT.FEE,
        field: 'opposition_carte',
        flatAmount: 5_000,
        priority: 1,
      },
      {
        code: 'VP_RELEVEMENT_1MOIS',
        label: 'Relèvement du plafond — 1 mois',
        description: '5 000 F CFA.',
        type: RT.FEE,
        field: 'relevement_plafond_1mois',
        flatAmount: 5_000,
        priority: 3,
      },
      {
        code: 'VP_RELEVEMENT_INDEF',
        label: 'Relèvement du plafond — durée indéterminée',
        description: '15 000 F CFA.',
        type: RT.FEE,
        field: 'relevement_plafond_indefini',
        flatAmount: 15_000,
        priority: 3,
      },
      {
        code: 'VP_COMMANDE_EXPRESS',
        label: 'Commande express',
        description: '25 000 F CFA.',
        type: RT.FEE,
        field: 'commande_express',
        flatAmount: 25_000,
        priority: 3,
      },
      {
        code: 'VP_LIVRAISON_DHL',
        label: 'Livraison DHL',
        description: '25 000 F CFA.',
        type: RT.FEE,
        field: 'livraison_dhl',
        flatAmount: 25_000,
        priority: 3,
      },
    ],
  );

  // Carte Visa Platinum
  await upsertProduct(
    'VISA_PLATINUM',
    'Carte Visa Platinum',
    'Carte Visa Platinum — gamme haut de gamme particuliers avec plafonds les plus élevés (A-II §2.2.2.1.5.4)',
    'CARD',
    'A-II-2.2.2.1.5.4',
    [
      {
        code: 'VPL_ABONNEMENT',
        label: "Frais d'abonnement et de gestion mensuel",
        description:
          '12 500 F CFA par mois. Carte premium avec services étendus.',
        type: RT.FEE,
        field: 'frais_abonnement_mensuel',
        flatAmount: 12_500,
        period: RP.MONTHLY,
        priority: 1,
      },
      {
        code: 'VPL_RETRAIT_GAB_MAX_JOUR',
        label: 'Montant maximum retrait GAB par jour',
        description:
          '3 000 000 F CFA par jour — plafond le plus élevé de la gamme.',
        type: RT.LIMIT,
        field: 'retrait_gab_max_jour',
        operator: RO.LTE,
        value: 3_000_000,
        priority: 1,
      },
      {
        code: 'VPL_PAIEMENT_TPE_MAX_JOUR',
        label: 'Montant maximum paiement TPE par jour',
        description: '5 000 000 F CFA par jour.',
        type: RT.LIMIT,
        field: 'paiement_tpe_max_jour',
        operator: RO.LTE,
        value: 5_000_000,
        priority: 1,
      },
      {
        code: 'VPL_NB_TX_JOUR',
        label: 'Nombre maximum de transactions journalières',
        description: '10 transactions par jour.',
        type: RT.LIMIT,
        field: 'nb_transactions_jour',
        operator: RO.LTE,
        value: 10,
        priority: 1,
      },
      {
        code: 'VPL_VALIDITE_ANS',
        label: 'Durée de validité de la carte',
        description: '3 ans.',
        type: RT.LIMIT,
        field: 'validite_annees',
        value: 3,
        priority: 1,
      },
      {
        code: 'VPL_RETRAIT_DAB_ORABANK',
        label: 'Retrait au DAB Orabank',
        description: 'Franco (gratuit).',
        type: RT.FEE,
        field: 'retrait_dab_orabank',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'VPL_RETRAIT_DAB_GIM',
        label: 'Retrait au DAB GIM-UEMOA',
        description: '500 F CFA par retrait.',
        type: RT.FEE,
        field: 'retrait_dab_gim_uemoa',
        flatAmount: 500,
        priority: 1,
      },
      {
        code: 'VPL_RETRAIT_DAB_HORS_PAYS',
        label: 'Retrait au DAB hors pays',
        description: '2% du montant + TAF.',
        type: RT.FEE,
        field: 'retrait_dab_hors_pays',
        percentage: 2,
        priority: 1,
      },
      {
        code: 'VPL_ANNULATION',
        label: 'Annulation de la carte',
        description: '10 000 F CFA.',
        type: RT.FEE,
        field: 'annulation_carte',
        flatAmount: 10_000,
        priority: 2,
      },
      {
        code: 'VPL_REFECTION',
        label: 'Réfection de la carte',
        description: '12 000 F CFA.',
        type: RT.FEE,
        field: 'refection_carte',
        flatAmount: 12_000,
        priority: 2,
      },
      {
        code: 'VPL_REEDITION_CODE',
        label: 'Réédition du code PIN',
        description: '2 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'reedition_code_pin',
        flatAmount: 2_000,
        priority: 3,
      },
      {
        code: 'VPL_OPPOSITION',
        label: 'Opposition sur carte',
        description: '5 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'opposition_carte',
        flatAmount: 5_000,
        priority: 1,
      },
      {
        code: 'VPL_RELEVEMENT_1MOIS',
        label: 'Relèvement du plafond — 1 mois',
        description: '5 000 F CFA.',
        type: RT.FEE,
        field: 'relevement_plafond_1mois',
        flatAmount: 5_000,
        priority: 3,
      },
      {
        code: 'VPL_RELEVEMENT_INDEF',
        label: 'Relèvement du plafond — durée indéterminée',
        description: '15 000 F CFA.',
        type: RT.FEE,
        field: 'relevement_plafond_indefini',
        flatAmount: 15_000,
        priority: 3,
      },
    ],
  );

  // Carte Visa KEAZ
  await upsertProduct(
    'VISA_KEAZ',
    'Carte Visa KEAZ',
    'Carte Visa KEAZ — entrée de gamme budget avec plafonds mensuels (A-II §2.2.2.1.5.5)',
    'CARD',
    'A-II-2.2.2.1.5.5',
    [
      {
        code: 'VK_ABONNEMENT',
        label: "Frais d'abonnement mensuel",
        description:
          '900 F CFA par mois — carte économique à faibles plafonds.',
        type: RT.FEE,
        field: 'frais_abonnement_mensuel',
        flatAmount: 900,
        period: RP.MONTHLY,
        priority: 1,
      },
      {
        code: 'VK_RETRAIT_GAB_MAX_MOIS',
        label: 'Montant maximum retrait GAB par mois',
        description:
          '150 000 F CFA par mois (plafond mensuel et non journalier — spécificité KEAZ).',
        type: RT.LIMIT,
        field: 'retrait_gab_max_mois',
        operator: RO.LTE,
        value: 150_000,
        period: RP.MONTHLY,
        priority: 1,
      },
      {
        code: 'VK_PAIEMENT_TPE_MAX_MOIS',
        label: 'Montant maximum paiement TPE par mois',
        description:
          '150 000 F CFA par mois (plafond mensuel — spécificité KEAZ).',
        type: RT.LIMIT,
        field: 'paiement_tpe_max_mois',
        operator: RO.LTE,
        value: 150_000,
        period: RP.MONTHLY,
        priority: 1,
      },
      {
        code: 'VK_NB_TX_JOUR',
        label: 'Nombre maximum de transactions journalières',
        description: '10 transactions par jour.',
        type: RT.LIMIT,
        field: 'nb_transactions_jour',
        operator: RO.LTE,
        value: 10,
        priority: 1,
      },
      {
        code: 'VK_VALIDITE_ANS',
        label: 'Durée de validité de la carte',
        description: '3 ans.',
        type: RT.LIMIT,
        field: 'validite_annees',
        value: 3,
        priority: 1,
      },
      {
        code: 'VK_RETRAIT_DAB_ORABANK',
        label: 'Retrait au DAB Orabank',
        description: 'Franco (gratuit).',
        type: RT.FEE,
        field: 'retrait_dab_orabank',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'VK_RETRAIT_DAB_GIM',
        label: 'Retrait au DAB GIM-UEMOA',
        description: '500 F CFA par retrait.',
        type: RT.FEE,
        field: 'retrait_dab_gim_uemoa',
        flatAmount: 500,
        priority: 1,
      },
      {
        code: 'VK_RETRAIT_DAB_HORS_PAYS',
        label: 'Retrait au DAB hors pays',
        description: '2% du montant + TAF.',
        type: RT.FEE,
        field: 'retrait_dab_hors_pays',
        percentage: 2,
        priority: 1,
      },
      {
        code: 'VK_ANNULATION',
        label: 'Annulation de la carte',
        description: '10 000 F CFA.',
        type: RT.FEE,
        field: 'annulation_carte',
        flatAmount: 10_000,
        priority: 2,
      },
      {
        code: 'VK_REFECTION',
        label: 'Réfection de la carte',
        description: '12 000 F CFA.',
        type: RT.FEE,
        field: 'refection_carte',
        flatAmount: 12_000,
        priority: 2,
      },
      {
        code: 'VK_REEDITION_CODE',
        label: 'Réédition du code PIN',
        description: '2 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'reedition_code_pin',
        flatAmount: 2_000,
        priority: 3,
      },
      {
        code: 'VK_OPPOSITION',
        label: 'Opposition sur carte',
        description: '5 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'opposition_carte',
        flatAmount: 5_000,
        priority: 1,
      },
      {
        code: 'VK_RELEVEMENT_1MOIS',
        label: 'Relèvement du plafond — 1 mois',
        description: '5 000 F CFA.',
        type: RT.FEE,
        field: 'relevement_plafond_1mois',
        flatAmount: 5_000,
        priority: 3,
      },
      {
        code: 'VK_RELEVEMENT_INDEF',
        label: 'Relèvement du plafond — durée indéterminée',
        description: '15 000 F CFA.',
        type: RT.FEE,
        field: 'relevement_plafond_indefini',
        flatAmount: 15_000,
        priority: 3,
      },
    ],
  );

  // ── A-II §2.2.3 : Virements & Prélèvements — Particuliers ─────────────────
  await upsertProduct(
    'VIREMENTS_PART',
    'Virements et Prélèvements — Particuliers',
    'Virements internes, UEMOA, SWIFT et prélèvements pour particuliers (A-II §2.2.3)',
    'PAYMENT',
    'A-II-2.2.3',
    [
      {
        code: 'VIR_DOMICIL_SALAIRE',
        label: 'Domiciliation de salaires',
        description:
          'Franco (gratuit) — mise en place de la domiciliation de salaire sur le compte Orabank.',
        type: RT.FEE,
        field: 'domiciliation_salaire',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'VIR_INTERNE',
        label: 'Virement interne (compte à compte même banque)',
        description:
          'Franco (gratuit) — virement entre deux comptes Orabank, reçu ou émis.',
        type: RT.FEE,
        field: 'virement_interne',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'VIR_SUR_PLACE_TIERS',
        label: 'Virement sur place vers un tiers (STAR-UEMOA)',
        description:
          "2 000 F CFA + TAF. Virement vers un compte d'une autre banque de la même ville via le système STAR-UEMOA.",
        type: RT.FEE,
        field: 'virement_sur_place_tiers',
        flatAmount: 2_000,
        priority: 1,
      },
      {
        code: 'VIR_INTER_AGENCES',
        label: "Virement entre agences Orabank en faveur d'un tiers",
        description:
          'Franco (gratuit) — virement entre agences du réseau Orabank.',
        type: RT.FEE,
        field: 'virement_inter_agences',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'VIR_UEMOA',
        label: 'Virement dans la zone UEMOA (STAR-UEMOA)',
        description:
          "15 000 F CFA + TAF. Virement vers un compte bancaire dans l'espace UEMOA (Bénin, Burkina, CI, Guinée-Bissau, Mali, Niger, Sénégal, Togo).",
        type: RT.FEE,
        field: 'virement_uemoa',
        flatAmount: 15_000,
        priority: 1,
      },
      {
        code: 'VIR_ENCAISSEMENT_RECU',
        label:
          'Encaissement de virements reçus (nationaux, communautaires, internationaux)',
        description:
          'Franco (gratuit) — aucuns frais pour les virements reçus, quelle que soit leur origine.',
        type: RT.FEE,
        field: 'encaissement_virement_recu',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'VIR_PERMANENT_CREATION',
        label: 'Virement permanent — création du dossier',
        description:
          "Franco (gratuit) — mise en place initiale d'un virement automatique récurrent.",
        type: RT.FEE,
        field: 'virement_permanent_creation',
        flatAmount: 0,
        priority: 2,
      },
      {
        code: 'VIR_PERMANENT_EXEC',
        label: 'Virement permanent — exécution (par opération)',
        description:
          'Franco (gratuit) — chaque exécution du virement permanent est gratuite.',
        type: RT.FEE,
        field: 'virement_permanent_execution',
        flatAmount: 0,
        priority: 2,
      },
      {
        code: 'VIR_PERMANENT_MODIF',
        label: "Modification d'un virement permanent",
        description:
          'Franco (gratuit) — modification du bénéficiaire, montant ou périodicité.',
        type: RT.FEE,
        field: 'virement_permanent_modification',
        flatAmount: 0,
        priority: 2,
      },
      {
        code: 'VIR_MISE_DISPO_ORABANK',
        label: 'Mise à disposition de fonds — réseau Orabank',
        description:
          "5 000 F CFA + TAF. Mise à disposition d'espèces dans une agence Orabank pour un bénéficiaire.",
        type: RT.FEE,
        field: 'mise_dispo_reseau_orabank',
        flatAmount: 5_000,
        priority: 2,
      },
      {
        code: 'VIR_MISE_DISPO_UEMOA',
        label: 'Mise à disposition de fonds — zone UEMOA',
        description:
          '15 000 F CFA + TAF. Mise à disposition dans une autre banque UEMOA.',
        type: RT.FEE,
        field: 'mise_dispo_uemoa',
        flatAmount: 15_000,
        priority: 2,
      },
      {
        code: 'PREL_CREATION',
        label: 'Prélèvement automatique — création du dossier',
        description:
          'Franco (gratuit) — autorisation de prélèvement accordée à un créancier.',
        type: RT.FEE,
        field: 'prelevement_creation',
        flatAmount: 0,
        priority: 2,
      },
      {
        code: 'PREL_EXEC',
        label: 'Prélèvement automatique — exécution',
        description:
          'Franco (gratuit) — chaque exécution de prélèvement est gratuite.',
        type: RT.FEE,
        field: 'prelevement_execution',
        flatAmount: 0,
        priority: 2,
      },
      {
        code: 'PREL_OPPOSITION',
        label: 'Opposition sur avis de prélèvement',
        description:
          'Franco (gratuit) — révocation ou opposition à un prélèvement.',
        type: RT.FEE,
        field: 'prelevement_opposition',
        flatAmount: 0,
        priority: 2,
      },
    ],
  );

  // ── A-III : Services bancaires — Particuliers ──────────────────────────────
  await upsertProduct(
    'SERVICES_BANCAIRES_PART',
    'Services Bancaires — Particuliers',
    'Dates de valeur et frais liés aux opérations bancaires courantes particuliers (A-III)',
    'BANKING',
    'A-III',
    [
      // ── Dates de valeur ────────────────────────────────────────────────────
      {
        code: 'DV_VIREMENTS_RECUS',
        label: 'Date de valeur — virements reçus',
        description:
          'J (jour ouvré de réception) — les virements reçus sont crédités en valeur le jour même.',
        type: RT.VALUE_DATE,
        field: 'dv_virements_recus',
        value: 0,
        priority: 1,
      },
      {
        code: 'DV_REMISE_CHQ_ORABANK',
        label: 'Date de valeur — remise de chèque guichet Orabank',
        description:
          "J+1 — chèque remis au guichet d'une agence Orabank, crédité le lendemain ouvré.",
        type: RT.VALUE_DATE,
        field: 'dv_remise_cheque_orabank',
        value: 1,
        priority: 1,
      },
      {
        code: 'DV_REMISE_CHQ_AUTRES',
        label: 'Date de valeur — remise de chèque autres banques',
        description:
          'J+2 — chèque tiré sur une autre banque, crédité 2 jours ouvrés après remise.',
        type: RT.VALUE_DATE,
        field: 'dv_remise_cheque_autres_banques',
        value: 2,
        priority: 1,
      },
      {
        code: 'DV_VIREMENTS_EMIS',
        label: 'Date de valeur — virements émis et paiements de chèques',
        description:
          'J-1 — les débits par virement ou paiement de chèque sont passés en valeur la veille ouvrée.',
        type: RT.VALUE_DATE,
        field: 'dv_virements_emis',
        value: -1,
        priority: 1,
      },
      {
        code: 'DV_ESPECES',
        label: "Date de valeur — versement et retrait d'espèces",
        description:
          'J — les opérations en espèces sont créditées/débitées en valeur le jour même.',
        type: RT.VALUE_DATE,
        field: 'dv_especes',
        value: 0,
        priority: 1,
      },
      // ── Frais ──────────────────────────────────────────────────────────────
      {
        code: 'SB_DEPOT_ESPECES',
        label: "Dépôt d'espèces en agence",
        description:
          'Franco (gratuit, hors frais de timbre fiscal de 100 F CFA par versement)',
        type: RT.FEE,
        field: 'depot_especes_agence',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'SB_RETRAIT_ESPECES',
        label: "Retrait d'espèces en agence",
        description:
          'Franco (gratuit) — hors chèques de guichet qui sont tarifés séparément.',
        type: RT.FEE,
        field: 'retrait_especes_agence',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'SB_CHQ_BANQUE_FCFA',
        label: 'Émission de chèque de banque en F CFA',
        description:
          'Franco (gratuit) — voir tarif A-II §2.2.1.4 (5 000 + TAF) pour chèques de banque tarifés',
        type: RT.FEE,
        field: 'emission_cheque_banque_fcfa',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'SB_REJET_CHEQUE',
        label: 'Rejet de chèque impayé',
        description:
          "7 000 F CFA + TAF. Si lettre d'injonction : 7 500 F CFA + TAF (en sus).",
        type: RT.FEE,
        field: 'rejet_cheque_impaye',
        flatAmount: 7_000,
        priority: 1,
      },
      {
        code: 'SB_OPPOSITION',
        label: "Demande d'opposition (chèque/chéquier)",
        description: '10 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'demande_opposition',
        flatAmount: 10_000,
        priority: 1,
      },
      {
        code: 'SB_ATD_SAISIE',
        label: 'Incident sur compte — ATD / Saisie-arrêt',
        description:
          "15 000 F CFA + TAF. Frais de traitement d'un Avis à Tiers Détenteur ou d'une saisie-arrêt sur compte.",
        type: RT.FEE,
        field: 'frais_atd_saisie_arret',
        flatAmount: 15_000,
        priority: 1,
      },
      {
        code: 'SB_SAISIE_ATTRIBUTION',
        label: 'Frais de saisie attribution ATD',
        description: '15 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'frais_saisie_attribution',
        flatAmount: 15_000,
        priority: 1,
      },
      {
        code: 'SB_CIRCULARISATION',
        label: 'Frais de circularisation',
        description:
          'Franco (gratuit) — réponse aux demandes de circularisation des commissaires aux comptes.',
        type: RT.FEE,
        field: 'frais_circularisation',
        flatAmount: 0,
        priority: 3,
      },
      {
        code: 'SB_CHANGEMENT_SIGN',
        label: 'Changement de signature sur compte',
        description: 'Franco (gratuit).',
        type: RT.FEE,
        field: 'changement_signature',
        flatAmount: 0,
        priority: 3,
      },
      {
        code: 'SB_MODIF_INTITULE',
        label: "Modification d'intitulé de compte",
        description: 'Franco (gratuit).',
        type: RT.FEE,
        field: 'modification_intitule',
        flatAmount: 0,
        priority: 3,
      },
      {
        code: 'SB_NANTISSEMENT',
        label: 'Frais de nantissement',
        description:
          'Au réel — frais récupérés auprès du client selon justificatifs (notaire, enregistrement, etc.).',
        type: RT.FEE,
        field: 'frais_nantissement',
        flatAmount: 0,
        priority: 3,
      },
    ],
  );

  // ── A-IV : Banque à Distance — Particuliers ────────────────────────────────
  await upsertProduct(
    'BAD_PART',
    'Banque à Distance — Particuliers',
    'Services digitaux : Or@Net, My KEAZ, KEAZ SPOT, WhatsApp Banking, SMS (A-IV)',
    'DIGITAL',
    'A-IV',
    [
      {
        code: 'BAD_AVIS_ELECT',
        label: 'Avis de débit/crédit par voie électronique',
        description:
          'Franco (gratuit) — notifications SMS/email automatiques sur mouvements de compte.',
        type: RT.FEE,
        field: 'avis_debit_credit_electronique',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'BAD_ORANET',
        label: 'Banque en ligne Or@Net (abonnement)',
        description:
          '500 F CFA par mois. Accès à la banque en ligne Orabank (consultation, virements, téléchargement de relevés).',
        type: RT.FEE,
        field: 'abonnement_oranet',
        flatAmount: 500,
        period: RP.MONTHLY,
        priority: 1,
      },
      {
        code: 'BAD_VIR_ELECTRONIQUE',
        label: 'Virement électronique vers un autre établissement bancaire',
        description:
          '2 000 F CFA + TAF par virement initié via internet (Or@Net ou My KEAZ) vers une autre banque.',
        type: RT.FEE,
        field: 'virement_electronique_autre_banque',
        flatAmount: 2_000,
        priority: 1,
      },
      {
        code: 'BAD_SMS',
        label: 'Services SMS banking',
        description:
          'Franco (gratuit) — demande de solde et alertes mouvements par SMS.',
        type: RT.FEE,
        field: 'services_sms_banking',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'BAD_CONSULTATION_WEB',
        label:
          'Consultation/gestion compte internet (coûts à charge du client)',
        description:
          'Franco (gratuit côté banque) — les frais de connexion internet sont à la charge du client.',
        type: RT.FEE,
        field: 'consultation_web',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'BAD_KEAZ_INTERNET',
        label: 'Banque par Internet KEAZ',
        description:
          "Franco (gratuit) — accès internet via l'application KEAZ.",
        type: RT.FEE,
        field: 'keaz_internet',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'BAD_MYKEAZ_SOUSCRIPTION',
        label: 'Application My KEAZ — souscription',
        description:
          "Franco (gratuit) — téléchargement et activation de l'application mobile My KEAZ.",
        type: RT.FEE,
        field: 'mykeaz_souscription',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'BAD_MYKEAZ_FACTURES',
        label: 'My KEAZ — paiement de factures OTR, CNSS, CEET',
        description:
          "Franco (gratuit) — paiement en ligne des impôts (OTR), cotisations sociales (CNSS) et factures d'électricité (CEET).",
        type: RT.FEE,
        field: 'mykeaz_paiement_factures',
        flatAmount: 0,
        priority: 2,
      },
      {
        code: 'BAD_MYKEAZ_RELEVE_DL',
        label: 'My KEAZ — téléchargement de relevé (PDF, CSV, RTF)',
        description:
          'Franco (gratuit) — export du relevé de compte en format numérique.',
        type: RT.FEE,
        field: 'mykeaz_telechargement_releve',
        flatAmount: 0,
        priority: 2,
      },
      {
        code: 'BAD_MYKEAZ_RECHARGE',
        label: 'My KEAZ — rechargement de carte Visa prépayée',
        description:
          '1,5% du montant rechargé + TAF, minimum 1 000 F CFA + TAF par opération.',
        type: RT.FEE,
        field: 'mykeaz_recharge_visa_prepayee',
        percentage: 1.5,
        minAmount: 1_000,
        priority: 2,
      },
      {
        code: 'BAD_KEAZ_SPOT_DEPOT',
        label: 'KEAZ SPOT — transfert de fonds (dépôt)',
        description:
          "Franco (gratuit) — dépôt d'espèces via le réseau d'agents KEAZ SPOT.",
        type: RT.FEE,
        field: 'keaz_spot_depot',
        flatAmount: 0,
        priority: 2,
      },
      {
        code: 'BAD_KEAZ_SPOT_RETRAIT',
        label: "KEAZ SPOT — retrait d'espèces",
        description: '0,95% TTC du montant retiré via un agent KEAZ SPOT.',
        type: RT.FEE,
        field: 'keaz_spot_retrait',
        percentage: 0.95,
        priority: 2,
      },
      {
        code: 'BAD_KEAZ_SPOT_JETON',
        label: 'KEAZ SPOT — achat de jeton Keaz Cash',
        description: '0,95% TTC du montant du jeton Keaz Cash acheté.',
        type: RT.FEE,
        field: 'keaz_spot_achat_jeton',
        percentage: 0.95,
        priority: 2,
      },
      {
        code: 'BAD_ERELEVE',
        label: 'eRelevé (relevé électronique)',
        description:
          'Franco (gratuit) — abonnement au relevé de compte mensuel électronique.',
        type: RT.FEE,
        field: 'ereleve_electronique',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'BAD_WA_SOUSCRIPTION',
        label: 'WhatsApp Banking — souscription',
        description:
          'Franco (gratuit) — activation du service WhatsApp Banking Orabank.',
        type: RT.FEE,
        field: 'whatsapp_banking_souscription',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'BAD_WA_SOLDE',
        label: 'WhatsApp Banking — demande de solde',
        description: 'Franco (gratuit) — consultation du solde via WhatsApp.',
        type: RT.FEE,
        field: 'whatsapp_banking_solde',
        flatAmount: 0,
        priority: 2,
      },
      {
        code: 'BAD_WA_MINI_RELEVE',
        label: 'WhatsApp Banking — mini relevé',
        description:
          'Franco (gratuit) — dernières opérations du compte via WhatsApp.',
        type: RT.FEE,
        field: 'whatsapp_banking_mini_releve',
        flatAmount: 0,
        priority: 2,
      },
      {
        code: 'BAD_WA_VIR_LOCAL',
        label: 'WhatsApp Banking — virements locaux Orabank',
        description:
          'Franco (gratuit) — virement de compte à compte Orabank initié via WhatsApp.',
        type: RT.FEE,
        field: 'whatsapp_banking_virement_local',
        flatAmount: 0,
        priority: 2,
      },
      {
        code: 'BAD_WA_BANK_WALLET',
        label: 'WhatsApp Banking — Bank to Wallet (compte vers mobile money)',
        description:
          '0,5% TTC du montant transféré. Transfert de son compte bancaire vers un portefeuille mobile money (Flooz, T-Money, etc.).',
        type: RT.FEE,
        field: 'whatsapp_banking_bank_to_wallet',
        percentage: 0.5,
        priority: 2,
      },
    ],
  );

  // ── A-V : Incidents de paiement — Particuliers ─────────────────────────────
  await upsertProduct(
    'INCIDENTS_PART',
    'Incidents de Paiement — Particuliers',
    'Frais de gestion des incidents de paiement : opposition BCEAO, relances, CIP (A-V)',
    'INCIDENT',
    'A-V',
    [
      {
        code: 'INC_DECL_OPPOSITION_BC',
        label: "Déclaration d'opposition à la Banque Centrale (BCEAO)",
        description:
          'Franco (gratuit) — déclaration obligatoire suite à un chèque impayé.',
        type: RT.FEE,
        field: 'declaration_opposition_bceao',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'INC_MAINLEVEE_BC',
        label: "Mainlevée d'opposition Banque Centrale",
        description:
          "Franco (gratuit) — levée de l'opposition après régularisation.",
        type: RT.FEE,
        field: 'mainlevee_opposition_bceao',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'INC_RELANCE_SIMPLE',
        label: 'Lettre de relance compte débiteur — pli simple',
        description:
          'Franco (gratuit) — courrier de relance envoyé au client ayant un compte débiteur.',
        type: RT.FEE,
        field: 'relance_debiteur_pli_simple',
        flatAmount: 0,
        priority: 2,
      },
      {
        code: 'INC_RELANCE_RECOMM',
        label: 'Lettre de relance compte débiteur — pli recommandé',
        description:
          'Au réel — frais de recommandé récupérés au coût postal réel.',
        type: RT.FEE,
        field: 'relance_debiteur_recommande',
        flatAmount: 0,
        priority: 2,
      },
      {
        code: 'INC_DECL_CIP',
        label:
          'Lettre de déclaration à la CIP (Centrale des Incidents de Paiement)',
        description:
          '7 500 F CFA + TAF. Déclaration obligatoire à la Centrale des Incidents de Paiement de la BCEAO.',
        type: RT.FEE,
        field: 'declaration_cip_bceao',
        flatAmount: 7_500,
        priority: 1,
      },
      {
        code: 'INC_INFO_PREALABLE',
        label: "Lettre d'information préalable au rejet de chèque",
        description:
          'Franco (gratuit) — information obligatoire du tireur avant rejet effectif.',
        type: RT.FEE,
        field: 'info_prealable_rejet_cheque',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'INC_CERTIFICAT_NP',
        label: 'Certificat de non-paiement',
        description:
          "Franco (gratuit) — document attestant le non-paiement d'un chèque.",
        type: RT.FEE,
        field: 'certificat_non_paiement',
        flatAmount: 0,
        priority: 2,
      },
    ],
  );

  // ── A-VI : Opérations de change — Particuliers ─────────────────────────────
  await upsertProduct(
    'CHANGE_PART',
    'Opérations de Change — Particuliers',
    'Achat et vente de billets de banque étrangers et devises (A-VI)',
    'FOREX',
    'A-VI',
    [
      {
        code: 'CHANGE_BILLETS_COM',
        label:
          'Achat/vente de billets de banque étrangers — commission de manipulation',
        description:
          "2% du montant échangé. Applicable à l'achat et à la vente de devises fiduciaires (billets). Taux de change selon cours du jour.",
        type: RT.FEE,
        field: 'commission_change_billets',
        percentage: 2,
        priority: 1,
      },
    ],
  );

  // ── A-VII §7.1 : Crédit à la consommation — Particuliers ──────────────────
  await upsertProduct(
    'CREDIT_CONSO_PART',
    'Crédit à la Consommation — Particuliers',
    'Découverts formalisés, facilités de caisse, crédits court terme particuliers (A-VII §7.1)',
    'LOAN',
    'A-VII-7.1',
    [
      // ── Découvert formalisé (automatique sur domiciliation de salaire) ──────
      {
        code: 'CC_DECOUVERT_PLAFOND_PCT',
        label: 'Découvert formalisé — plafond en % du salaire net domicilié',
        description:
          'Plafond = 25% du salaire net domicilié, avec un maximum absolu de 1 000 000 F CFA. Nécessite une domiciliation ferme et irrévocable du salaire.',
        type: RT.LIMIT,
        field: 'decouvert_pct_salaire',
        operator: RO.LTE,
        value: 25,
        priority: 1,
      },
      {
        code: 'CC_DECOUVERT_PLAFOND_MAX',
        label: 'Découvert formalisé — plafond maximum absolu',
        description:
          'Plafond maximum de 1 000 000 F CFA quel que soit le salaire.',
        type: RT.LIMIT,
        field: 'decouvert_montant_max',
        operator: RO.LTE,
        value: 1_000_000,
        priority: 1,
      },
      {
        code: 'CC_DECOUVERT_FRAIS_DOSSIER',
        label: 'Découvert formalisé — frais de dossier',
        description:
          '5 000 F CFA + TAF à la mise en place initiale ou au renouvellement.',
        type: RT.FEE,
        field: 'frais_dossier_decouvert',
        flatAmount: 5_000,
        priority: 1,
      },
      {
        code: 'CC_DECOUVERT_DUREE_MOIS',
        label: 'Découvert formalisé — durée de la convention',
        description:
          '12 mois renouvelable. La convention de découvert est valable 1 an, renouvelable par tacite reconduction.',
        type: RT.LIMIT,
        field: 'decouvert_duree_mois',
        operator: RO.LTE,
        value: 12,
        priority: 2,
      },
      {
        code: 'CC_DECOUVERT_TAUX',
        label: "Découvert formalisé — taux d'intérêt annuel",
        description:
          "13% l'an + TAF. Taux fixe appliqué sur le montant utilisé du découvert autorisé.",
        type: RT.INTEREST,
        field: 'taux_decouvert_formel',
        percentage: 13,
        period: RP.YEARLY,
        priority: 1,
      },
      // ── Dépassement non formalisé ──────────────────────────────────────────
      {
        code: 'CC_DEPASSEMENT_TAUX_MARGE',
        label: 'Découvert non formalisé — taux (MTD + marge)',
        description:
          "MTD + 2,5 points, sans dépasser 14,95% l'an. Appliqué sur le montant en dépassement de découvert non autorisé. MTD actuel = 8%, donc taux applicable = 10,5% (plafonné à 14,95%).",
        type: RT.INTEREST,
        field: 'taux_depassement_non_formel',
        percentage: 2.5, // marge au-dessus du MTD
        maxAmount: 14.95, // plafond absolu en pourcentage
        period: RP.YEARLY,
        priority: 1,
      },
      {
        code: 'CC_DEPASSEMENT_COM',
        label: 'Découvert non formalisé — commission de dépassement',
        description:
          '0,5% Flat du montant en dépassement, minimum 5 F CFA. Prélevée à chaque incident.',
        type: RT.FEE,
        field: 'commission_depassement_non_formel',
        percentage: 0.5,
        minAmount: 5,
        priority: 2,
      },
      {
        code: 'CC_PLUS_FORT_DECOUVERT',
        label: 'Commission de plus fort découvert particuliers (mensuelle)',
        description:
          '0,05% du plus fort découvert du mois + TAF, minimum 500 F CFA + TAF.',
        type: RT.FEE,
        field: 'commission_plus_fort_decouvert',
        percentage: 0.05,
        minAmount: 500,
        period: RP.MONTHLY,
        priority: 2,
      },
      {
        code: 'CC_FACILITE_CAISSE',
        label: 'Facilités de caisse (crédit court terme non formalisé)',
        description:
          '0,5% + TAF. Commission appliquée sur les facilités de caisse ponctuelles accordées.',
        type: RT.FEE,
        field: 'commission_facilite_caisse',
        percentage: 0.5,
        priority: 2,
      },
      {
        code: 'CC_AUTRES_CT',
        label: 'Autres crédits à court terme — commission',
        description: '1,5% + TAF sur le montant du crédit accordé.',
        type: RT.FEE,
        field: 'commission_autres_credits_ct',
        percentage: 1.5,
        priority: 2,
      },
      {
        code: 'CC_DROIT_TIMBRE',
        label: 'Droit de timbre par feuille de convention de crédit',
        description:
          '1 500 F CFA par feuille de convention (timbre fiscal non soumis à TAF, reversé au Trésor).',
        type: RT.FEE,
        field: 'droit_timbre_convention_credit',
        flatAmount: 1_500,
        priority: 3,
      },
    ],
  );

  // ── A-VII §7.2 : Crédit habitat — Particuliers ────────────────────────────
  await upsertProduct(
    'CREDIT_HABITAT_PART',
    "Crédit à l'Habitat — Particuliers",
    "Prêts immobiliers, taux d'intérêt et frais connexes (A-VII §7.2)",
    'LOAN',
    'A-VII-7.2',
    [
      {
        code: 'CH_MOYEN_TERME_TAUX',
        label: 'Taux crédit habitat moyen terme',
        description:
          "7,75% l'an + TAF. Crédit immobilier d'une durée comprise entre 1 et 7 ans.",
        type: RT.INTEREST,
        field: 'taux_habitat_moyen_terme',
        percentage: 7.75,
        period: RP.YEARLY,
        priority: 1,
      },
      {
        code: 'CH_LONG_TERME_TAUX',
        label: 'Taux crédit habitat long terme',
        description:
          "7,75% l'an + TAF. Crédit immobilier d'une durée supérieure à 7 ans.",
        type: RT.INTEREST,
        field: 'taux_habitat_long_terme',
        percentage: 7.75,
        period: RP.YEARLY,
        priority: 1,
      },
      {
        code: 'CH_PRET_PARTICULIER_TAUX',
        label: 'Taux prêt immobilier standard aux particuliers',
        description:
          "8,5% l'an + TAF. Taux standard pour prêt immobilier particulier.",
        type: RT.INTEREST,
        field: 'taux_pret_immobilier_particulier',
        percentage: 8.5,
        period: RP.YEARLY,
        priority: 1,
      },
      {
        code: 'CH_ETUDE_DOSSIER',
        label: "Frais d'étude de dossier de crédit habitat",
        description:
          '1,5% Flat du montant + TAF, pour tout dossier dont le montant est supérieur à 1 500 000 F CFA.',
        type: RT.FEE,
        field: 'frais_etude_dossier_habitat',
        percentage: 1.5,
        minAmount: 1_500_000,
        priority: 1,
      },
      {
        code: 'CH_TAUX_INF_5ANS',
        label: "Taux d'intérêt — durée inférieure ou égale à 5 ans",
        description: "8% l'an + TAF.",
        type: RT.INTEREST,
        field: 'taux_habitat_inf_5ans',
        percentage: 8,
        period: RP.YEARLY,
        priority: 1,
      },
      {
        code: 'CH_TAUX_5_6ANS',
        label: "Taux d'intérêt — durée de 5 à 6 ans",
        description: "8,5% l'an + TAF.",
        type: RT.INTEREST,
        field: 'taux_habitat_5_6ans',
        percentage: 8.5,
        period: RP.YEARLY,
        priority: 1,
      },
      {
        code: 'CH_TAUX_7_8ANS',
        label: "Taux d'intérêt — durée de 7 à 8 ans",
        description: "9% l'an + TAF.",
        type: RT.INTEREST,
        field: 'taux_habitat_7_8ans',
        percentage: 9,
        period: RP.YEARLY,
        priority: 1,
      },
      {
        code: 'CH_TAUX_20ANS',
        label: "Taux d'intérêt — durée maximum 20 ans",
        description:
          '6% HT + TAF. Taux préférentiel pour les prêts sur 20 ans, limité à 15 000 000 F CFA.',
        type: RT.INTEREST,
        field: 'taux_habitat_20ans',
        percentage: 6,
        period: RP.YEARLY,
        priority: 1,
      },
      {
        code: 'CH_MONTANT_MAX_20ANS',
        label: 'Montant maximum — crédit sur 20 ans',
        description:
          '15 000 000 F CFA maximum pour le crédit habitat à taux de 6% sur 20 ans.',
        type: RT.LIMIT,
        field: 'montant_max_credit_20ans',
        operator: RO.LTE,
        value: 15_000_000,
        priority: 1,
      },
      {
        code: 'CH_DUREE_MAX',
        label: 'Durée maximale du crédit habitat',
        description:
          "20 ans maximum. La durée est définie selon la capacité de remboursement et l'âge du client.",
        type: RT.LIMIT,
        field: 'duree_max_credit_habitat_ans',
        operator: RO.LTE,
        value: 20,
        priority: 1,
      },
      {
        code: 'CH_PENALITE_ANTICIP',
        label: 'Pénalité sur remboursement anticipé',
        description:
          '1,5% + TAF du capital restant dû. Appliqué en cas de remboursement avant terme.',
        type: RT.FEE,
        field: 'penalite_remboursement_anticipe',
        percentage: 1.5,
        priority: 2,
      },
      {
        code: 'CH_RACHAT_INTERNE',
        label: 'Commission de rachat interne de crédit',
        description:
          "1,5% + TAF du montant racheté. Rachat d'un crédit existant chez Orabank.",
        type: RT.FEE,
        field: 'commission_rachat_interne',
        percentage: 1.5,
        priority: 2,
      },
      {
        code: 'CH_RACHAT_EXTERNE',
        label: 'Commission de rachat externe de crédit',
        description:
          "3% + TAF du capital repris, minimum 300 000 F CFA. Rachat d'un crédit accordé par une autre banque.",
        type: RT.FEE,
        field: 'commission_rachat_externe',
        percentage: 3,
        minAmount: 300_000,
        priority: 2,
      },
      {
        code: 'CH_RESTRUCTURATION',
        label: 'Commission de restructuration',
        description:
          '1% + TAF du montant restructuré, minimum 25 000 F CFA. Réaménagement des conditions du prêt.',
        type: RT.FEE,
        field: 'commission_restructuration',
        percentage: 1,
        minAmount: 25_000,
        priority: 2,
      },
      {
        code: 'CH_DROIT_TIMBRE',
        label: 'Droit de timbre par feuille de convention',
        description:
          '1 500 F CFA par feuille (timbre fiscal, non soumis à TAF).',
        type: RT.FEE,
        field: 'droit_timbre_convention_habitat',
        flatAmount: 1_500,
        priority: 3,
      },
      {
        code: 'CH_MAINLEVEE_HYPO',
        label: "Mainlevée d'hypothèque partielle ou totale",
        description:
          "10 000 F CFA + TAF. Hors frais notariés et d'enregistrement (récupérés au réel).",
        type: RT.FEE,
        field: 'mainlevee_hypotheque',
        flatAmount: 10_000,
        priority: 2,
      },
      {
        code: 'CH_MAINLEVEE_PROMESSE',
        label: "Frais de mainlevée de promesse d'hypothèque",
        description: '10 000 F CFA + TAF. Hors frais notariés.',
        type: RT.FEE,
        field: 'mainlevee_promesse_hypotheque',
        flatAmount: 10_000,
        priority: 2,
      },
      {
        code: 'CH_FRAIS_IMPAYE',
        label: "Frais d'impayé au remboursement",
        description:
          "3% + TAF du montant de l'échéance impayée. Prélevé à chaque incident de remboursement.",
        type: RT.FEE,
        field: 'frais_impaye_remboursement',
        percentage: 3,
        priority: 2,
      },
      {
        code: 'CH_ETAT_ENGAGEMENT',
        label: "Frais d'état d'engagement",
        description:
          "50 000 F CFA + TAF. Document certifiant l'état des engagements du client vis-à-vis de la banque.",
        type: RT.FEE,
        field: 'frais_etat_engagement',
        flatAmount: 50_000,
        priority: 3,
      },
      {
        code: 'CH_FRAIS_ANTICIPATION',
        label: "Frais d'anticipation",
        description:
          '2% + TAF du capital anticipé. Frais en sus de la pénalité de remboursement anticipé.',
        type: RT.FEE,
        field: 'frais_anticipation_credit',
        percentage: 2,
        priority: 2,
      },
      {
        code: 'CH_ECHEANCE_IMPAYEE',
        label: "Frais d'échéance impayée",
        description:
          "2% + TAF du montant de l'échéance impayée (selon périodicité : mensuelle, trimestrielle, etc.).",
        type: RT.FEE,
        field: 'frais_echeance_impayee_habitat',
        percentage: 2,
        priority: 2,
      },
    ],
  );

  // ── A-VIII : Opérations avec l'étranger — Particuliers ────────────────────
  await upsertProduct(
    'ETRANGER_PART',
    "Opérations avec l'Étranger — Particuliers",
    'Chèques étrangers, transferts SWIFT, virements internationaux particuliers (A-VIII)',
    'INTERNATIONAL',
    'A-VIII',
    [
      {
        code: 'ETR_ENCAISSEMENT_PCT',
        label: "Frais d'encaissement de chèque payable à l'étranger",
        description: '0,25% du montant + TAF.',
        type: RT.FEE,
        field: 'encaissement_cheque_etranger',
        percentage: 0.25,
        priority: 1,
      },
      {
        code: 'ETR_MANIPULATION',
        label: 'Frais de manipulation (chèque étranger)',
        description:
          '1 100 F CFA TTC par chèque. Frais fixes de traitement opérationnel.',
        type: RT.FEE,
        field: 'frais_manipulation_cheque_etranger',
        flatAmount: 1_100,
        priority: 2,
      },
      {
        code: 'ETR_PORT_LETTRE',
        label: 'Frais de port de lettre',
        description:
          '2 000 F CFA par envoi postal (+ tarif courrier en vigueur).',
        type: RT.FEE,
        field: 'frais_port_lettre_etranger',
        flatAmount: 2_000,
        priority: 3,
      },
      {
        code: 'ETR_COM_CHANGE',
        label: 'Commission de change — chèque libellé en devises',
        description:
          '0,25% du montant + TAF. Appliquée lors de la conversion de devises étrangères en F CFA.',
        type: RT.FEE,
        field: 'commission_change_cheque_etranger',
        percentage: 0.25,
        priority: 2,
      },
      {
        code: 'ETR_IMPAYE',
        label: "Frais d'impayé sur chèque étranger",
        description: '7 000 F CFA + TAF par chèque retourné impayé.',
        type: RT.FEE,
        field: 'frais_impaye_cheque_etranger',
        flatAmount: 7_000,
        priority: 1,
      },
      {
        code: 'ETR_FRAIS_DOSSIER_EMISSION',
        label:
          "Frais de dossier — émission de chèque de banque à destination d'un pays étranger",
        description: "10 000 F CFA + TAF par dossier d'émission.",
        type: RT.FEE,
        field: 'frais_dossier_emission_cheque_banque',
        flatAmount: 10_000,
        priority: 1,
      },
      {
        code: 'ETR_TRANSFERT_UEMOA',
        label: 'Transfert zone UEMOA',
        description:
          "15 000 F CFA + TAF. Virement vers un pays membre de l'UEMOA via STAR-UEMOA.",
        type: RT.FEE,
        field: 'transfert_zone_uemoa',
        flatAmount: 15_000,
        priority: 1,
      },
      {
        code: 'ETR_SWIFT_AVEC_CHANGE',
        label: 'Virement SWIFT hors UEMOA — avec change (autres devises)',
        description:
          "0,2% du montant + TAF. Virement en devises vers l'étranger avec conversion depuis le F CFA.",
        type: RT.FEE,
        field: 'virement_swift_avec_change',
        percentage: 0.2,
        priority: 1,
      },
      {
        code: 'ETR_SWIFT_SANS_CHANGE',
        label: 'Virement SWIFT hors UEMOA — sans change',
        description:
          '0,3% + TAF. En sus : 7,75% + TAF (frais de correspondant et taux de refinancement). Pour virements en F CFA vers compte hors UEMOA.',
        type: RT.FEE,
        field: 'virement_swift_sans_change',
        percentage: 0.3,
        priority: 1,
      },
      {
        code: 'ETR_APPEL_FONDS',
        label: 'Appel de fonds émis',
        description:
          "5 000 F CFA + TAF. Service de mise à disposition de fonds à l'étranger (ex: virement reçu en attente).",
        type: RT.FEE,
        field: 'appel_fonds_emis',
        flatAmount: 5_000,
        priority: 2,
      },
    ],
  );

  // ── A-IX : Autres services — Particuliers ─────────────────────────────────
  await upsertProduct(
    'AUTRES_SERVICES_PART',
    'Autres Services (divers) — Particuliers',
    'Recherche de documents, renseignements, successions, saisies — particuliers (A-IX)',
    'MISC',
    'A-IX',
    [
      {
        code: 'AS_RECHERCHE_0_90J',
        label: 'Frais de recherche de documents — 0 à 90 jours',
        description:
          '2 000 F CFA + TAF par document recherché dans les 90 derniers jours (tranches 0-30j, 30-60j, 60-90j : même tarif).',
        type: RT.FEE,
        field: 'recherche_doc_0_90j',
        flatAmount: 2_000,
        priority: 2,
      },
      {
        code: 'AS_RECHERCHE_SUP_1AN',
        label: "Frais de recherche de documents — plus d'un an",
        description:
          '5 000 F CFA + TAF pour recherche entre 1 et 5 ans. Au-delà de 5 ans : 6 000 + 5 000 par année supplémentaire + TAF.',
        type: RT.FEE,
        field: 'recherche_doc_sup_1an',
        flatAmount: 5_000,
        priority: 2,
      },
      {
        code: 'AS_PHOTOCOPIE',
        label: 'Supplément par photocopie',
        description:
          '25 F CFA par page copiée (en sus des frais de recherche).',
        type: RT.FEE,
        field: 'supplement_photocopie',
        flatAmount: 25,
        priority: 3,
      },
      {
        code: 'AS_RENSEIGN_CLIENT',
        label: 'Demande de renseignements sur client',
        description:
          "25 000 F CFA + TAF. Réponse à une demande externe de renseignements sur un client (ex: enquête bancaire d'une autre institution).",
        type: RT.FEE,
        field: 'renseignements_sur_client',
        flatAmount: 25_000,
        priority: 2,
      },
      {
        code: 'AS_RENSEIGN_FINANCIER',
        label: 'Demande de renseignements financiers',
        description: '25 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'renseignements_financiers',
        flatAmount: 25_000,
        priority: 2,
      },
      {
        code: 'AS_RENSEIGN_COMPTABLE',
        label:
          'Demande de renseignements comptables (Commissaires aux Comptes)',
        description:
          '25 000 F CFA + TAF. Réponse aux demandes des CAC dans le cadre de leur mission légale.',
        type: RT.FEE,
        field: 'renseignements_comptables_cac',
        flatAmount: 25_000,
        priority: 2,
      },
      {
        code: 'AS_ABONNEMENT_SITE',
        label: 'Abonnement mensuel au site internet Orabank',
        description: '500 F CFA + TAF par mois.',
        type: RT.FEE,
        field: 'abonnement_site_internet',
        flatAmount: 500,
        period: RP.MONTHLY,
        priority: 3,
      },
      {
        code: 'AS_SUCCESSION_OUV',
        label: "Frais d'ouverture de dossier de succession",
        description:
          '10 000 F CFA + TAF. Ouverture du dossier de succession au décès du titulaire du compte.',
        type: RT.FEE,
        field: 'succession_ouverture_dossier',
        flatAmount: 10_000,
        priority: 2,
      },
      {
        code: 'AS_SUCCESSION_REGL',
        label: "Frais de dossier de succession (au règlement selon l'actif)",
        description:
          '25 000 F CFA + TAF. Frais prélevés lors du règlement définitif de la succession.',
        type: RT.FEE,
        field: 'succession_frais_reglement',
        flatAmount: 25_000,
        priority: 2,
      },
      {
        code: 'AS_SUCCESSION_TENUE',
        label: 'Frais annuels de tenue du compte de succession',
        description:
          '3 000 F CFA + TAF par an. Frais de gestion du compte pendant la période de liquidation de la succession.',
        type: RT.FEE,
        field: 'succession_tenue_compte_annuelle',
        flatAmount: 3_000,
        period: RP.YEARLY,
        priority: 2,
      },
      {
        code: 'AS_SAISIE_ARRET',
        label: 'Frais de saisie-arrêt / ATD / opposition administrative',
        description:
          '15 000 F CFA + TAF par procédure de saisie, ATD (Avis à Tiers Détenteur) ou opposition administrative.',
        type: RT.FEE,
        field: 'frais_saisie_arret_atd',
        flatAmount: 15_000,
        priority: 1,
      },
      {
        code: 'AS_ATTESTATION_AVOIRS',
        label: "Attestation d'avoirs",
        description:
          '30 000 F CFA + TAF. Document certifiant la valeur totale des avoirs détenus à la banque.',
        type: RT.FEE,
        field: 'attestation_avoirs',
        flatAmount: 30_000,
        priority: 2,
      },
    ],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION B — ENTREPRISES ET ONG
  // ═══════════════════════════════════════════════════════════════════════════

  // ── B-I : Comptes Entreprises / ONG ───────────────────────────────────────
  await upsertProduct(
    'COMPTES_ENT',
    'Comptes — Entreprises et ONG',
    'Ouverture et clôture de comptes courants, DAT et instruments financiers entreprises (B-I)',
    'ACCOUNT',
    'B-I',
    [
      {
        code: 'ENT_OUV_FRANCO',
        label: 'Ouverture de compte (avec convention)',
        description:
          'Franco (gratuit) — ouverture de tout type de compte avec remise de la convention de compte.',
        type: RT.FEE,
        field: 'ouverture_compte_entreprise',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'ENT_INSTRUMENTS_FIN',
        label: "Compte d'instruments financiers (SA / SARL / ETS)",
        description:
          "50 000 F CFA pour SA, SARL ou ETS. Compte dédié à la gestion d'instruments financiers.",
        type: RT.FEE,
        field: 'compte_instruments_financiers',
        flatAmount: 50_000,
        priority: 1,
      },
      {
        code: 'ENT_COMPTE_COURANT',
        label: 'Ouverture compte courant entreprise',
        description: "50 000 F CFA de dépôt initial obligatoire à l'ouverture.",
        type: RT.FEE,
        field: 'ouverture_compte_courant_ent',
        flatAmount: 50_000,
        priority: 1,
      },
      {
        code: 'ENT_DEPOT_INITIAL',
        label: "Dépôt initial minimum à l'ouverture",
        description:
          '50 000 F CFA minimum requis pour tout ouverture de compte courant entreprise.',
        type: RT.ELIGIBILITY,
        field: 'depot_initial_entreprise',
        operator: RO.GTE,
        value: 50_000,
        weight: 100,
        priority: 1,
      },
      {
        code: 'ENT_DAT_GDE_ENT',
        label: 'DAT Grande Entreprise / Institution — dépôt minimum',
        description:
          '10 000 000 F CFA minimum. Taux selon grille DAT en vigueur.',
        type: RT.ELIGIBILITY,
        field: 'dat_grande_entreprise_min',
        operator: RO.GTE,
        value: 10_000_000,
        weight: 100,
        priority: 1,
      },
      {
        code: 'ENT_DAT_ONG',
        label: 'DAT ONG / Associations — dépôt minimum',
        description:
          '5 000 000 F CFA minimum. Taux selon grille DAT en vigueur.',
        type: RT.ELIGIBILITY,
        field: 'dat_ong_association_min',
        operator: RO.GTE,
        value: 5_000_000,
        weight: 100,
        priority: 1,
      },
      {
        code: 'ENT_CLO_DAT',
        label: 'Clôture DAT société / ONG',
        description: 'Franco (gratuit).',
        type: RT.FEE,
        field: 'cloture_dat_entreprise',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'ENT_CLO_COURANT',
        label: 'Clôture compte courant société / entreprise individuelle',
        description: 'Franco (gratuit).',
        type: RT.FEE,
        field: 'cloture_compte_courant_ent',
        flatAmount: 0,
        priority: 1,
      },
    ],
  );

  // ── B-II §2.1 : Gestion de compte — Entreprises ───────────────────────────
  await upsertProduct(
    'GESTION_COMPTE_ENT',
    'Gestion de Compte — Entreprises et ONG',
    "Conditions débitrices/créditrices, tenues de compte par type d'entité, attestations (B-II §2.1)",
    'ACCOUNT',
    'B-II-2.1',
    [
      {
        code: 'GE_TAUX_DEBITEUR_MTD',
        label: 'Meilleur taux débiteur (MTD)',
        description:
          "8% l'an + TAF. Taux débiteur de référence pour les entreprises.",
        type: RT.INTEREST,
        field: 'taux_debiteur_entreprise',
        percentage: 8,
        period: RP.YEARLY,
        priority: 1,
      },
      {
        code: 'GE_PLUS_FORT_DECOUVERT',
        label: 'Commission de plus fort découvert (mensuelle)',
        description:
          '0,10%/mois + TAF, minimum 50 000 F CFA + TAF. Prélevée mensuellement sur le plus fort débit du mois.',
        type: RT.FEE,
        field: 'commission_plus_fort_decouvert_ent',
        percentage: 0.1,
        minAmount: 50_000,
        period: RP.MONTHLY,
        priority: 2,
      },
      {
        code: 'GE_COM_MVT_DEBIT',
        label: 'Commission mouvement débit — compte courant',
        description:
          'Franco (gratuit) — aucune commission sur les mouvements au débit du compte courant.',
        type: RT.FEE,
        field: 'commission_mvt_debit_courant_ent',
        flatAmount: 0,
        priority: 2,
      },
      {
        code: 'GE_DEPASSEMENT_AUTORISE',
        label: 'Commission dépassement — compte autorisé',
        description: '0,5% Flat + TAF du montant du dépassement.',
        type: RT.FEE,
        field: 'commission_depassement_autorise_ent',
        percentage: 0.5,
        priority: 2,
      },
      {
        code: 'GE_DEPASSEMENT_NON_AUTH',
        label: 'Commission dépassement — compte non autorisé',
        description: '0,5% Flat + TAF du montant en dépassement.',
        type: RT.FEE,
        field: 'commission_depassement_non_autorise_ent',
        percentage: 0.5,
        priority: 2,
      },
      // ── Frais de tenue par type d\'entité ──────────────────────────────────
      {
        code: 'GE_TENUE_SARL_SA',
        label: 'Frais de tenue de compte — SARL / SA (mensuel)',
        description:
          '5 000 F CFA + TAF par mois pour les sociétés commerciales (SARL et SA).',
        type: RT.FEE,
        field: 'tenue_compte_sarl_sa',
        flatAmount: 5_000,
        period: RP.MONTHLY,
        priority: 1,
      },
      {
        code: 'GE_TENUE_ETS',
        label:
          'Frais de tenue de compte — Établissements / Institutionnels (mensuel)',
        description: '3 000 F CFA + TAF par mois.',
        type: RT.FEE,
        field: 'tenue_compte_ets_institutionnels',
        flatAmount: 3_000,
        period: RP.MONTHLY,
        priority: 1,
      },
      {
        code: 'GE_TENUE_TPE',
        label: 'Frais de tenue de compte — Très Petites Entreprises (mensuel)',
        description: '2 000 F CFA + TAF par mois.',
        type: RT.FEE,
        field: 'tenue_compte_tres_petites_entreprises',
        flatAmount: 2_000,
        period: RP.MONTHLY,
        priority: 1,
      },
      {
        code: 'GE_TENUE_PE',
        label: 'Frais de tenue de compte — Petites Entreprises (mensuel)',
        description: '3 000 F CFA + TAF par mois.',
        type: RT.FEE,
        field: 'tenue_compte_petites_entreprises',
        flatAmount: 3_000,
        period: RP.MONTHLY,
        priority: 1,
      },
      {
        code: 'GE_TENUE_ONG_ASSOC',
        label:
          'Frais de tenue de compte — Ambassades / ONG / Associations (mensuel)',
        description:
          '1 000 F CFA + TAF par mois. Inclut : ambassades, représentations diplomatiques, ONG locales et internationales, petites associations, groupements, écoles et confessions religieuses.',
        type: RT.FEE,
        field: 'tenue_compte_ong_associations',
        flatAmount: 1_000,
        period: RP.MONTHLY,
        priority: 1,
      },
      // ── Relevés et attestations ────────────────────────────────────────────
      {
        code: 'GE_RELEVE_DEMANDE',
        label: 'Relevé de compte à la demande (mois en cours)',
        description:
          '5 000 F CFA par relevé demandé hors relevé mensuel automatique.',
        type: RT.FEE,
        field: 'releve_demande_ent',
        flatAmount: 5_000,
        priority: 2,
      },
      {
        code: 'GE_RELEVE_AUTRE_PERIODE',
        label: 'Relevé autre période (tarif par année)',
        description:
          "6 000 F CFA × nombre d'années + TAF. Ex: 3 ans = 18 000 + TAF.",
        type: RT.FEE,
        field: 'releve_autre_periode_ent',
        flatAmount: 6_000,
        priority: 2,
      },
      {
        code: 'GE_ATTEST_SOLDE',
        label: 'Attestation de solde',
        description: '30 000 F CFA.',
        type: RT.FEE,
        field: 'attestation_solde_ent',
        flatAmount: 30_000,
        priority: 2,
      },
      {
        code: 'GE_ATTEST_NON_ENGAGEMENT',
        label: 'Attestation de non-engagement',
        description: '60 000 F CFA.',
        type: RT.FEE,
        field: 'attestation_non_engagement_ent',
        flatAmount: 60_000,
        priority: 2,
      },
      {
        code: 'GE_ATTEST_DEDUCTIBILITE',
        label: 'Attestation de déductibilité fiscale',
        description: '25 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'attestation_deductibilite_ent',
        flatAmount: 25_000,
        priority: 2,
      },
      {
        code: 'GE_ATTEST_COMPTE',
        label: 'Attestation de compte',
        description: '25 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'attestation_compte_ent',
        flatAmount: 25_000,
        priority: 2,
      },
      {
        code: 'GE_ATTEST_CAUTION',
        label: 'Attestation de caution solidaire',
        description: '25 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'attestation_caution_solidaire_ent',
        flatAmount: 25_000,
        priority: 2,
      },
      {
        code: 'GE_TIMBRE_VERSEMENT',
        label: "Frais de timbre fiscal pour versement d'espèces",
        description:
          '100 F CFA par opération de versement (timbre fiscal reversé au Trésor).',
        type: RT.FEE,
        field: 'frais_timbre_versement_ent',
        flatAmount: 100,
        priority: 3,
      },
    ],
  );

  // ── B-II §2.2.2 : Carte Visa Business ─────────────────────────────────────
  await upsertProduct(
    'VISA_BUSINESS',
    'Carte Visa Business',
    'Carte Visa Business — carte entreprise avec plafonds élevés (B-II §2.2.2.1.2.1)',
    'CARD',
    'B-II-2.2.2.1.2.1',
    [
      {
        code: 'VB_ABONNEMENT',
        label: "Frais d'abonnement et de gestion mensuel",
        description: '7 500 F CFA par mois par carte.',
        type: RT.FEE,
        field: 'frais_abonnement_mensuel',
        flatAmount: 7_500,
        period: RP.MONTHLY,
        priority: 1,
      },
      {
        code: 'VB_RETRAIT_GAB_MAX_JOUR',
        label: 'Montant maximum retrait GAB par jour',
        description: '2 000 000 F CFA par jour.',
        type: RT.LIMIT,
        field: 'retrait_gab_max_jour',
        operator: RO.LTE,
        value: 2_000_000,
        priority: 1,
      },
      {
        code: 'VB_PAIEMENT_TPE_MIN_JOUR',
        label: 'Montant minimum paiement TPE par jour',
        description:
          '2 500 000 F CFA minimum par jour en paiement commerçant (plafond plancher Business).',
        type: RT.LIMIT,
        field: 'paiement_tpe_min_jour',
        operator: RO.GTE,
        value: 2_500_000,
        priority: 1,
      },
      {
        code: 'VB_NB_TX_JOUR',
        label: 'Nombre maximum de transactions journalières',
        description: '10 transactions par jour.',
        type: RT.LIMIT,
        field: 'nb_transactions_jour',
        operator: RO.LTE,
        value: 10,
        priority: 1,
      },
      {
        code: 'VB_VALIDITE_ANS',
        label: 'Durée de validité de la carte',
        description: '3 ans.',
        type: RT.LIMIT,
        field: 'validite_annees',
        value: 3,
        priority: 1,
      },
      {
        code: 'VB_RETRAIT_DAB_ORABANK',
        label: 'Retrait au DAB Orabank',
        description: 'Franco (gratuit).',
        type: RT.FEE,
        field: 'retrait_dab_orabank',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'VB_RETRAIT_DAB_GIM',
        label: 'Retrait au DAB GIM-UEMOA',
        description: '500 F CFA par retrait.',
        type: RT.FEE,
        field: 'retrait_dab_gim_uemoa',
        flatAmount: 500,
        priority: 1,
      },
      {
        code: 'VB_RETRAIT_DAB_HORS_PAYS',
        label: 'Retrait au GAB hors pays',
        description: '2% + TAF du montant.',
        type: RT.FEE,
        field: 'retrait_dab_hors_pays',
        percentage: 2,
        priority: 1,
      },
      {
        code: 'VB_DAB_HORS_UEMOA',
        label: 'Retrait DAB hors zone UEMOA',
        description:
          '1,6% du montant (tarif spécifique Business pour zone hors UEMOA — non soumis à TAF sur ce taux).',
        type: RT.FEE,
        field: 'retrait_dab_hors_uemoa',
        percentage: 1.6,
        priority: 1,
      },
      {
        code: 'VB_ANNULATION',
        label: 'Annulation de la carte',
        description: '10 000 F CFA.',
        type: RT.FEE,
        field: 'annulation_carte',
        flatAmount: 10_000,
        priority: 2,
      },
      {
        code: 'VB_REFECTION',
        label: 'Réfection de la carte',
        description: '12 000 F CFA.',
        type: RT.FEE,
        field: 'refection_carte',
        flatAmount: 12_000,
        priority: 2,
      },
      {
        code: 'VB_REEDITION_CODE',
        label: 'Réédition du code PIN',
        description: '2 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'reedition_code_pin',
        flatAmount: 2_000,
        priority: 3,
      },
      {
        code: 'VB_OPPOSITION',
        label: 'Opposition sur carte entreprise',
        description:
          "45 000 F CFA. Tarif entreprise significativement supérieur au tarif particulier (usage professionnel et responsabilité de l'entreprise).",
        type: RT.FEE,
        field: 'opposition_carte_entreprise',
        flatAmount: 45_000,
        priority: 1,
      },
    ],
  );

  // ── B-II §2.2.4 : Effets de commerce — Entreprises ────────────────────────
  await upsertProduct(
    'EFFETS_COMMERCE_ENT',
    'Effets de Commerce — Entreprises',
    'Encaissement, endos, protêt et prorogation sur effets de commerce (B-II §2.2.4)',
    'PAYMENT',
    'B-II-2.2.4',
    [
      {
        code: 'EC_PAIEMENT',
        label: "Frais sur paiement d'effets",
        description: 'Franco (gratuit).',
        type: RT.FEE,
        field: 'frais_paiement_effets',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'EC_ENCAISSEMENT',
        label: "Frais d'encaissement sur effets",
        description: '5 000 F CFA + TAF par effet encaissé.',
        type: RT.FEE,
        field: 'frais_encaissement_effets',
        flatAmount: 5_000,
        priority: 1,
      },
      {
        code: 'EC_BORDEREAU',
        label: 'Commission de bordereau',
        description:
          "10 000 F CFA + TAF par bordereau d'effets remis à l'encaissement ou à l'escompte.",
        type: RT.FEE,
        field: 'commission_bordereau',
        flatAmount: 10_000,
        priority: 1,
      },
      {
        code: 'EC_ENDOS',
        label: "Commission d'endos",
        description:
          "0,15% du montant de l'effet + TAF, minimum 1 000 F CFA + TAF.",
        type: RT.FEE,
        field: 'commission_endos',
        percentage: 0.15,
        minAmount: 1_000,
        priority: 1,
      },
      {
        code: 'EC_INTERET',
        label: "Taux d'intérêt sur effets de commerce",
        description:
          "11% l'an. Taux appliqué lors de l'escompte d'effets de commerce.",
        type: RT.INTEREST,
        field: 'taux_interet_effets_commerce',
        percentage: 11,
        period: RP.YEARLY,
        priority: 1,
      },
      {
        code: 'EC_PORT_LETTRE',
        label: 'Port de lettre',
        description:
          "2 000 F CFA + tarif courrier en vigueur. Frais d'envoi postal des effets.",
        type: RT.FEE,
        field: 'port_lettre_effets',
        flatAmount: 2_000,
        priority: 3,
      },
      {
        code: 'EC_PROTET',
        label: 'Frais de protêt',
        description:
          "15 000 F CFA + TAF. Acte d'huissier constatant le non-paiement d'un effet à son échéance.",
        type: RT.FEE,
        field: 'frais_protet',
        flatAmount: 15_000,
        priority: 2,
      },
      {
        code: 'EC_PROROGATION',
        label: "Frais de prorogation d'échéance",
        description:
          "40 000 F CFA + TAF. Report de la date d'échéance d'un effet de commerce.",
        type: RT.FEE,
        field: 'frais_prorogation_echeance',
        flatAmount: 40_000,
        priority: 2,
      },
      {
        code: 'EC_ETRANGER_ENVOI',
        label: "Encaissement d'effet sur l'étranger — frais d'envoi",
        description:
          "5 000 F CFA + TAF + tarif courrier. Envoi d'effet à l'encaissement à l'étranger.",
        type: RT.FEE,
        field: 'effet_etranger_frais_envoi',
        flatAmount: 5_000,
        priority: 2,
      },
      {
        code: 'EC_ETRANGER_COM',
        label:
          "Encaissement d'effet sur l'étranger — commission d'encaissement",
        description: '11 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'effet_etranger_commission_encaissement',
        flatAmount: 11_000,
        priority: 2,
      },
      {
        code: 'EC_ETRANGER_MISE_DISPO',
        label:
          "Encaissement d'effet sur l'étranger — frais de mise à disposition",
        description:
          '2 000 F CFA + TAF. Frais de mise à disposition des fonds encaissés.',
        type: RT.FEE,
        field: 'effet_etranger_mise_disposition',
        flatAmount: 2_000,
        priority: 2,
      },
    ],
  );

  // ── B-IV : Banque à distance — Entreprises ─────────────────────────────────
  await upsertProduct(
    'BAD_ENT',
    'Banque à Distance — Entreprises',
    'E-banking, KEAZ PRO, KEAZ SPOT, SMS, eRelevé pour entreprises (B-IV)',
    'DIGITAL',
    'B-IV',
    [
      {
        code: 'BAD_ENT_ORANET',
        label: 'Banque en ligne Or@Net Entreprises (abonnement)',
        description:
          '1 500 F CFA par mois. Accès à la plateforme de banque en ligne entreprises.',
        type: RT.FEE,
        field: 'abonnement_oranet_entreprises',
        flatAmount: 1_500,
        period: RP.MONTHLY,
        priority: 1,
      },
      {
        code: 'BAD_ENT_ORAMOBILE',
        label: 'Oramobile (application mobile entreprises)',
        description: 'Franco (gratuit).',
        type: RT.FEE,
        field: 'oramobile_entreprises',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'BAD_ENT_VIR_ELECT',
        label: 'Virement électronique vers un autre établissement',
        description: '2 000 F CFA + TAF par virement initié via internet.',
        type: RT.FEE,
        field: 'virement_electronique_autre_etablissement_ent',
        flatAmount: 2_000,
        priority: 1,
      },
      {
        code: 'BAD_ENT_SMS',
        label: 'Services SMS banking entreprises',
        description:
          'Franco (gratuit) — alertes mouvements et demandes de solde par SMS.',
        type: RT.FEE,
        field: 'sms_banking_entreprises',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'BAD_ENT_CONSULTATION',
        label: 'Accès consultation / gestion compte internet',
        description: '1 500 F CFA + TAF par mois.',
        type: RT.FEE,
        field: 'consultation_internet_entreprises',
        flatAmount: 1_500,
        period: RP.MONTHLY,
        priority: 1,
      },
      {
        code: 'BAD_ENT_KEAZ_PRO',
        label: 'KEAZ PRO Internet (banque en ligne PME)',
        description: 'Gratuit (Franco). Plateforme internet dédiée aux PME.',
        type: RT.FEE,
        field: 'keaz_pro_internet',
        flatAmount: 0,
        priority: 1,
      },
      {
        code: 'BAD_ENT_KEAZ_SPOT',
        label: 'KEAZ SPOT entreprises',
        description:
          "Gratuit (Franco). Réseau d'agents KEAZ SPOT pour dépôts/retraits entreprises.",
        type: RT.FEE,
        field: 'keaz_spot_entreprises',
        flatAmount: 0,
        priority: 2,
      },
      {
        code: 'BAD_ENT_FACTURES',
        label: 'Paiement de factures OTR, CNSS, CEET (entreprises)',
        description:
          "Gratuit (Franco). Paiement en ligne des taxes, cotisations et factures d'énergie.",
        type: RT.FEE,
        field: 'paiement_factures_entreprises',
        flatAmount: 0,
        priority: 2,
      },
      {
        code: 'BAD_ENT_ERELEVE',
        label: 'eRelevé entreprises',
        description: 'Franco (gratuit) — relevé mensuel électronique.',
        type: RT.FEE,
        field: 'ereleve_entreprises',
        flatAmount: 0,
        priority: 1,
      },
    ],
  );

  // ── B-VIII §8.1 : Crédits de trésorerie — Entreprises ─────────────────────
  await upsertProduct(
    'CREDIT_TRESORERIE_ENT',
    'Crédits de Trésorerie — Entreprises',
    'Crédits court, moyen et long terme entreprises — taux exprimés en marge sur TBB (B-VIII §8.1)',
    'LOAN',
    'B-VIII-8.1',
    [
      // ── Court terme ────────────────────────────────────────────────────────
      {
        code: 'CT_COM_DOSSIER_CT',
        label: 'Commission de dossier — crédits court terme',
        description:
          '1,5% max + TAF du montant, minimum 50 000 F CFA + TAF. Prélevée à la mise en place.',
        type: RT.FEE,
        field: 'commission_dossier_court_terme',
        percentage: 1.5,
        minAmount: 50_000,
        priority: 1,
      },
      {
        code: 'CT_DECOUVERT_MARGE',
        label: 'Découvert en compte — taux (TBB + marge)',
        description:
          'TBB + 3,5% + TAF. Le taux effectif = Taux de Base Bancaire en vigueur + 3,5 points. TBB fixé par la BCEAO (variable).',
        type: RT.INTEREST,
        field: 'marge_decouverte_entreprise',
        percentage: 3.5,
        period: RP.YEARLY,
        priority: 1,
      },
      {
        code: 'CT_AUTRES_CT_MARGE',
        label: 'Autres crédits court terme — taux (TBB + marge)',
        description:
          'TBB + 4% maximum + TAF. Appliqué aux crédits de campagne, crédits de stocks, crédits spot.',
        type: RT.INTEREST,
        field: 'marge_autres_credits_ct',
        percentage: 4,
        period: RP.YEARLY,
        priority: 1,
      },
      // ── Moyen et long terme ────────────────────────────────────────────────
      {
        code: 'CT_COM_DOSSIER_MLT',
        label: 'Commission de dossier — crédits moyen et long terme',
        description: '1,5% max + TAF du montant, minimum 50 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'commission_dossier_moyen_long_terme',
        percentage: 1.5,
        minAmount: 50_000,
        priority: 1,
      },
      {
        code: 'CT_MOYEN_TERME_MARGE',
        label: 'Crédits moyen terme — taux (TBB + marge)',
        description: 'TBB + 4% + TAF. Pour investissements de 2 à 7 ans.',
        type: RT.INTEREST,
        field: 'marge_credit_moyen_terme',
        percentage: 4,
        period: RP.YEARLY,
        priority: 1,
      },
      {
        code: 'CT_LONG_TERME_MARGE',
        label: 'Crédits long terme — taux (TBB + marge)',
        description: 'TBB + 4% + TAF. Pour investissements de plus de 7 ans.',
        type: RT.INTEREST,
        field: 'marge_credit_long_terme',
        percentage: 4,
        period: RP.YEARLY,
        priority: 1,
      },
      // ── Autres financements ────────────────────────────────────────────────
      {
        code: 'CT_ESCOMPTE_MARGE',
        label: "Escompte d'effets de commerce — taux (TBB + marge)",
        description:
          "TBB + 1,5% + TAF. Mobilisation de créances commerciales via l'escompte d'effets.",
        type: RT.INTEREST,
        field: 'marge_escompte_effets',
        percentage: 1.5,
        period: RP.YEARLY,
        priority: 1,
      },
      {
        code: 'CT_FACILITE_CAISSE_MARGE',
        label: 'Facilités de caisse et avances — taux (TBB + marge)',
        description: 'TBB + 3,5% + TAF. Pour besoins de trésorerie ponctuels.',
        type: RT.INTEREST,
        field: 'marge_facilite_caisse_entreprise',
        percentage: 3.5,
        period: RP.YEARLY,
        priority: 1,
      },
      {
        code: 'CT_CONSOLIDATION_MARGE',
        label: 'Prêt de consolidation de découvert — taux (TBB + marge)',
        description:
          "TBB + 3,5% + TAF. Consolidation d'un découvert persistant en prêt amortissable.",
        type: RT.INTEREST,
        field: 'marge_consolidation_decouvert',
        percentage: 3.5,
        period: RP.YEARLY,
        priority: 1,
      },
      // ── Frais connexes ─────────────────────────────────────────────────────
      {
        code: 'CT_MAINLEVEE_HYPO',
        label: "Mainlevée d'hypothèque partielle ou totale",
        description:
          "10 000 F CFA + TAF. Hors frais notariés et d'enregistrement.",
        type: RT.FEE,
        field: 'mainlevee_hypotheque_ent',
        flatAmount: 10_000,
        priority: 2,
      },
      {
        code: 'CT_MODIF_SIMPLE',
        label: 'Modification simple du crédit (échéance, compte, périodicité)',
        description: '5 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'modification_simple_credit_ent',
        flatAmount: 5_000,
        priority: 3,
      },
      {
        code: 'CT_MODIF_TAUX_TABLEAU',
        label: "Modification de taux avec réédition du tableau d'amortissement",
        description: '5 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'modification_taux_tableau_amort',
        flatAmount: 5_000,
        priority: 3,
      },
      {
        code: 'CT_ECHEANCE_IMPAYEE',
        label: "Frais d'échéance impayée",
        description: "3% + TAF du montant de l'échéance impayée.",
        type: RT.FEE,
        field: 'frais_echeance_impayee_ent',
        percentage: 3,
        priority: 2,
      },
      {
        code: 'CT_ETUDE_DOSSIER',
        label: "Frais d'étude de dossier de prêt",
        description: '1,5% + TAF du montant demandé.',
        type: RT.FEE,
        field: 'frais_etude_dossier_pret_ent',
        percentage: 1.5,
        priority: 1,
      },
      {
        code: 'CT_ESCOMPTE_COM_MIN',
        label: "Frais et commissions d'escompte — minimum",
        description: "100 000 F CFA + TAF minimum par dossier d'escompte.",
        type: RT.FEE,
        field: 'commission_escompte_minimum',
        flatAmount: 100_000,
        priority: 2,
      },
    ],
  );

  // ── B-VIII §8.2 : Crédits par signature — Entreprises ─────────────────────
  await upsertProduct(
    'CREDIT_SIGNATURE_ENT',
    'Crédits par Signature — Entreprises',
    'Cautions sur marchés, cautions fiscales et douanières, avals de traites (B-VIII §8.2)',
    'LOAN',
    'B-VIII-8.2',
    [
      {
        code: 'CS_CAUTION_MARCHE',
        label: 'Caution sur marchés bancaires',
        description:
          "3% du montant cautionné + TAF, minimum 50 000 F CFA + TAF. Caution en faveur d'un maître d'ouvrage pour garantir l'exécution d'un marché.",
        type: RT.FEE,
        field: 'caution_marche_bancaire',
        percentage: 3,
        minAmount: 50_000,
        priority: 1,
      },
      {
        code: 'CS_SOUMISSION_INF_10M',
        label: 'Frais de dossier — caution de soumission < 10 000 000 F CFA',
        description:
          "25 000 F CFA + TAF. Caution permettant de participer à un appel d'offres.",
        type: RT.FEE,
        field: 'frais_dossier_caution_soumission_inf10m',
        flatAmount: 25_000,
        priority: 1,
      },
      {
        code: 'CS_SOUMISSION_10_50M',
        label: 'Frais de dossier — caution de soumission entre 10M et 50M',
        description: '35 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'frais_dossier_caution_soumission_10_50m',
        flatAmount: 35_000,
        priority: 1,
      },
      {
        code: 'CS_SOUMISSION_SUP_50M',
        label: 'Frais de dossier — caution de soumission > 50 000 000 F CFA',
        description: '50 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'frais_dossier_caution_soumission_sup50m',
        flatAmount: 50_000,
        priority: 1,
      },
      {
        code: 'CS_AUTRES_CAUTIONS',
        label: 'Autres cautions (bonne exécution, retenue de garantie, etc.)',
        description: '0,25% du montant + TAF, minimum 25 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'autres_cautions_entreprise',
        percentage: 0.25,
        minAmount: 25_000,
        priority: 1,
      },
      {
        code: 'CS_AVENANT',
        label: 'Avenant sur caution',
        description:
          "15 000 F CFA + TAF. Modification d'une caution existante (montant, durée, bénéficiaire).",
        type: RT.FEE,
        field: 'avenant_caution',
        flatAmount: 15_000,
        priority: 2,
      },
      {
        code: 'CS_MODIF_SIMPLE',
        label: "Modification simple d'une caution",
        description:
          "15 000 F CFA + TAF. Modification mineure (date d'échéance, numéro de compte, périodicité).",
        type: RT.FEE,
        field: 'modification_simple_caution',
        flatAmount: 15_000,
        priority: 2,
      },
      {
        code: 'CS_CAUTIONS_FISCALES',
        label: 'Cautions fiscales et douanières',
        description:
          "3% du montant + TAF, minimum 15 000 F CFA + TAF. Cautions accordées en faveur de l'administration fiscale ou des douanes.",
        type: RT.FEE,
        field: 'cautions_fiscales_douanieres',
        percentage: 3,
        minAmount: 15_000,
        priority: 1,
      },
      {
        code: 'CS_AVAL_TRAITES',
        label: 'Aval de traites',
        description:
          '3% du montant + TAF, minimum 15 000 F CFA + TAF. Garantie de paiement accordée par la banque sur un effet de commerce.',
        type: RT.FEE,
        field: 'aval_traites_entreprise',
        percentage: 3,
        minAmount: 15_000,
        priority: 1,
      },
      // ── Attestations caution de soumission ─────────────────────────────────
      {
        code: 'CS_ATT_SANS_MONTANT',
        label: 'Attestation caution de soumission — sans montant',
        description: '27 500 F CFA + TAF.',
        type: RT.FEE,
        field: 'attestation_caution_soumission_sans_montant',
        flatAmount: 27_500,
        priority: 2,
      },
      {
        code: 'CS_ATT_INF_10M',
        label: 'Attestation caution de soumission < 10M',
        description: '33 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'attestation_caution_soumission_inf10m',
        flatAmount: 33_000,
        priority: 2,
      },
      {
        code: 'CS_ATT_10_50M',
        label: 'Attestation caution de soumission 10M–50M',
        description: '55 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'attestation_caution_soumission_10_50m',
        flatAmount: 55_000,
        priority: 2,
      },
      {
        code: 'CS_ATT_50_200M',
        label: 'Attestation caution de soumission 50M–200M',
        description: '110 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'attestation_caution_soumission_50_200m',
        flatAmount: 110_000,
        priority: 2,
      },
      {
        code: 'CS_ATT_SUP_200M',
        label: 'Attestation caution de soumission > 200M',
        description: '275 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'attestation_caution_soumission_sup200m',
        flatAmount: 275_000,
        priority: 2,
      },
      // ── Frais de dossier par appel d\'offre ────────────────────────────────
      {
        code: 'CS_DOSSIER_INF_10M',
        label: 'Frais de dossier caution soumission — par AO < 10M',
        description: "27 500 F CFA + TAF par dossier d'appel d'offre.",
        type: RT.FEE,
        field: 'dossier_caution_soumission_par_ao_inf10m',
        flatAmount: 27_500,
        priority: 2,
      },
      {
        code: 'CS_DOSSIER_10_50M',
        label: 'Frais de dossier caution soumission — par AO 10M–50M',
        description: '38 500 F CFA + TAF par dossier.',
        type: RT.FEE,
        field: 'dossier_caution_soumission_par_ao_10_50m',
        flatAmount: 38_500,
        priority: 2,
      },
      {
        code: 'CS_DOSSIER_SUP_50M',
        label: 'Frais de dossier caution soumission — par AO > 50M',
        description: '55 000 F CFA + TAF par dossier.',
        type: RT.FEE,
        field: 'dossier_caution_soumission_par_ao_sup50m',
        flatAmount: 55_000,
        priority: 2,
      },
      {
        code: 'CS_MAINLEVEE_HYPO',
        label: "Mainlevée d'hypothèque (crédits par signature)",
        description: '11 000 F CFA + TAF. Hors frais notariés.',
        type: RT.FEE,
        field: 'mainlevee_hypo_credit_signature',
        flatAmount: 11_000,
        priority: 2,
      },
    ],
  );

  // ── B-IX : Opérations avec l'étranger — Entreprises ──────────────────────
  await upsertProduct(
    'ETRANGER_ENT',
    "Opérations avec l'Étranger — Entreprises",
    'Encaissements devises, émissions, transferts SWIFT et opérations documentaires entreprises (B-IX)',
    'INTERNATIONAL',
    'B-IX',
    [
      // ── Encaissement chèques/effets Euro ───────────────────────────────────
      {
        code: 'EE_EUR_COM_PROROGATION',
        label: 'Commission de prorogation / rapatriement — Euro',
        description:
          '25 000 F CFA + TAF. Report de délai de rapatriement de devises.',
        type: RT.FEE,
        field: 'commission_prorogation_rapatriement_eur',
        flatAmount: 25_000,
        priority: 2,
      },
      {
        code: 'EE_EUR_COM_ENCAISSEMENT',
        label: "Commission d'encaissement — Euro",
        description: '15 000 F CFA + TAF par chèque ou effet en Euro encaissé.',
        type: RT.FEE,
        field: 'commission_encaissement_eur',
        flatAmount: 15_000,
        priority: 1,
      },
      {
        code: 'EE_EUR_FRAIS_ENVOI',
        label: "Frais d'envoi — Euro",
        description: '2 000 F CFA + TAF + tarif courrier.',
        type: RT.FEE,
        field: 'frais_envoi_eur',
        flatAmount: 2_000,
        priority: 2,
      },
      {
        code: 'EE_EUR_IMPAYE',
        label: 'Provision pour retour de chèque impayé — Euro',
        description: '15 000 F CFA + TAF par chèque retourné impayé.',
        type: RT.FEE,
        field: 'provision_impaye_eur',
        flatAmount: 15_000,
        priority: 1,
      },
      {
        code: 'EE_EUR_SWIFT',
        label: 'Avis de sort / SWIFT — Euro',
        description: '15 000 F CFA + TAF par message SWIFT.',
        type: RT.FEE,
        field: 'swift_eur',
        flatAmount: 15_000,
        priority: 2,
      },
      // ── Autres devises ─────────────────────────────────────────────────────
      {
        code: 'EE_DEV_COM_CHANGE',
        label: 'Commission de change — autres devises',
        description: '0,3% du montant + TAF.',
        type: RT.FEE,
        field: 'commission_change_autres_devises',
        percentage: 0.3,
        priority: 1,
      },
      {
        code: 'EE_DEV_COM_ENCAISSEMENT',
        label: "Commission d'encaissement — autres devises",
        description: '0,35% du montant + TAF, minimum 10 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'commission_encaissement_autres_devises',
        percentage: 0.35,
        minAmount: 10_000,
        priority: 1,
      },
      {
        code: 'EE_DEV_SWIFT',
        label: 'Frais SWIFT — autres devises',
        description: '25 000 F CFA + TAF par message SWIFT.',
        type: RT.FEE,
        field: 'swift_autres_devises',
        flatAmount: 25_000,
        priority: 2,
      },
      // ── Émission chèques en devises ────────────────────────────────────────
      {
        code: 'EE_EMIS_DOSSIER',
        label: 'Frais de dossier — émission de chèque en devises',
        description: "10 000 F CFA + TAF par dossier d'émission.",
        type: RT.FEE,
        field: 'frais_dossier_emission_devises',
        flatAmount: 10_000,
        priority: 1,
      },
      {
        code: 'EE_EMIS_COM_TRANSFERT',
        label: 'Commission de transfert — émission de chèque en devises',
        description: '0,3% du montant + TAF.',
        type: RT.FEE,
        field: 'commission_transfert_emission_devises',
        percentage: 0.3,
        priority: 1,
      },
      {
        code: 'EE_EMIS_TAXE',
        label: 'Taxe sur émission — chèque en devises',
        description:
          '0,6% du montant. Taxe réglementaire sur les transferts hors UEMOA.',
        type: RT.FEE,
        field: 'taxe_emission_devises',
        percentage: 0.6,
        priority: 1,
      },
      {
        code: 'EE_EMIS_SWIFT',
        label: 'Frais SWIFT — émission de chèque en devises',
        description: '25 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'swift_emission_devises',
        flatAmount: 25_000,
        priority: 2,
      },
      // ── Transferts ─────────────────────────────────────────────────────────
      {
        code: 'EE_TRANSFERT_UEMOA',
        label: 'Transfert zone UEMOA',
        description: '15 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'transfert_uemoa_ent',
        flatAmount: 15_000,
        priority: 1,
      },
      {
        code: 'EE_HORS_UEMOA_TAXE',
        label: 'Transfert hors UEMOA — taxe réglementaire',
        description:
          '0,6% du montant. Taxe légale sur tout transfert hors zone UEMOA.',
        type: RT.FEE,
        field: 'taxe_transfert_hors_uemoa',
        percentage: 0.6,
        priority: 1,
      },
      {
        code: 'EE_HORS_UEMOA_COM',
        label: 'Transfert hors UEMOA — commission',
        description: '0,3% du montant + TAF.',
        type: RT.FEE,
        field: 'commission_transfert_hors_uemoa',
        percentage: 0.3,
        priority: 1,
      },
      {
        code: 'EE_HORS_UEMOA_SWIFT',
        label: 'Transfert hors UEMOA — frais SWIFT',
        description: '15 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'swift_transfert_hors_uemoa',
        flatAmount: 15_000,
        priority: 2,
      },
      {
        code: 'EE_HORS_UEMOA_DOSSIER',
        label: 'Transfert hors UEMOA — frais de dossier',
        description: '10 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'frais_dossier_transfert_hors_uemoa',
        flatAmount: 10_000,
        priority: 1,
      },
      {
        code: 'EE_AVEC_CHANGE_TAXE',
        label: 'Virement SWIFT avec change — taxe réglementaire',
        description: '0,6% du montant.',
        type: RT.FEE,
        field: 'taxe_virement_avec_change',
        percentage: 0.6,
        priority: 1,
      },
      {
        code: 'EE_AVEC_CHANGE_COM',
        label: 'Virement SWIFT avec change — commission',
        description: '0,2% du montant + TAF.',
        type: RT.FEE,
        field: 'commission_virement_avec_change',
        percentage: 0.2,
        priority: 1,
      },
      {
        code: 'EE_APPEL_FONDS',
        label: 'Appel de fonds émis',
        description: '5 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'appel_fonds_emis_ent',
        flatAmount: 5_000,
        priority: 2,
      },
      {
        code: 'EE_WE_COLLECT',
        label: 'Service WE COLLECT émis',
        description:
          '5 000 F CFA + TAF. Service de collecte internationale de fonds via correspondants.',
        type: RT.FEE,
        field: 'service_we_collect',
        flatAmount: 5_000,
        priority: 2,
      },
      // ── Remise documentaire import ─────────────────────────────────────────
      {
        code: 'RDI_DOSSIER',
        label: 'Remise documentaire import — frais de dossier',
        description: '10 000 F CFA + TAF par dossier de remise documentaire.',
        type: RT.FEE,
        field: 'rdi_frais_dossier',
        flatAmount: 10_000,
        priority: 1,
      },
      {
        code: 'RDI_ENCAISSEMENT',
        label: "Remise documentaire import — commission d'encaissement",
        description: '0,35% du montant + TAF, minimum 10 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'rdi_commission_encaissement',
        percentage: 0.35,
        minAmount: 10_000,
        priority: 1,
      },
      {
        code: 'RDI_PROROGATION',
        label: 'Remise documentaire import — commission de prorogation',
        description: "25 000 F CFA + TAF par report d'échéance.",
        type: RT.FEE,
        field: 'rdi_commission_prorogation',
        flatAmount: 25_000,
        priority: 2,
      },
      {
        code: 'RDI_ACCEPTATION',
        label: "Remise documentaire import — commission d'acceptation",
        description:
          "20 000 F CFA + TAF. Acceptation d'une traite documentaire.",
        type: RT.FEE,
        field: 'rdi_commission_acceptation',
        flatAmount: 20_000,
        priority: 2,
      },
      {
        code: 'RDI_TAXE_TRANSFERT',
        label: 'Remise documentaire import — taxe transfert hors UEMOA',
        description: '0,6% du montant réglé.',
        type: RT.FEE,
        field: 'rdi_taxe_transfert_hors_uemoa',
        percentage: 0.6,
        priority: 1,
      },
      {
        code: 'RDI_IMPAYE',
        label: 'Remise documentaire import — impayé',
        description: "15 000 F CFA + TAF par retour d'impayé.",
        type: RT.FEE,
        field: 'rdi_frais_impaye',
        flatAmount: 15_000,
        priority: 1,
      },
      {
        code: 'RDI_SWIFT',
        label: 'Remise documentaire import — SWIFT',
        description: '25 000 F CFA + TAF par message.',
        type: RT.FEE,
        field: 'rdi_swift',
        flatAmount: 25_000,
        priority: 2,
      },
      // ── Crédit documentaire import ─────────────────────────────────────────
      {
        code: 'CDI_DOSSIER',
        label: 'Crédit documentaire import — frais de dossier',
        description: "20 000 F CFA + TAF à l'ouverture du crédit documentaire.",
        type: RT.FEE,
        field: 'cdi_frais_dossier',
        flatAmount: 20_000,
        priority: 1,
      },
      {
        code: 'CDI_OUVERTURE',
        label: "Crédit documentaire import — commission d'ouverture",
        description:
          "0,6% par trimestre civil indivis + TAF, minimum 25 000 F CFA. Prélevée à l'ouverture et à chaque renouvellement trimestriel.",
        type: RT.FEE,
        field: 'cdi_commission_ouverture',
        percentage: 0.6,
        minAmount: 25_000,
        period: RP.MONTHLY,
        priority: 1,
        // period = MONTHLY représente ici la base trimestrielle (×3 dans la logique métier)
      },
      {
        code: 'CDI_UTILISATION',
        label: "Crédit documentaire import — commission d'utilisation",
        description: '0,5% du montant utilisé + TAF.',
        type: RT.FEE,
        field: 'cdi_commission_utilisation',
        percentage: 0.5,
        priority: 1,
      },
      {
        code: 'CDI_ACCEPTATION',
        label: "Crédit documentaire import — commission d'acceptation",
        description:
          "1% l'an + TAF, minimum 15 000 F CFA + TAF. Appliquée sur les crédits documentaires à terme.",
        type: RT.FEE,
        field: 'cdi_commission_acceptation',
        percentage: 1,
        minAmount: 15_000,
        period: RP.YEARLY,
        priority: 2,
      },
      {
        code: 'CDI_TAXE_TRANSFERT',
        label: 'Crédit documentaire import — taxe transfert hors UEMOA',
        description: "0,6% du montant réglé à l'étranger.",
        type: RT.FEE,
        field: 'cdi_taxe_transfert_hors_uemoa',
        percentage: 0.6,
        priority: 1,
      },
      // ── Crédit documentaire export ─────────────────────────────────────────
      {
        code: 'CDE_NOTIFICATION',
        label: 'Crédit documentaire export — commission de notification',
        description: '0,10% du montant + TAF, minimum 15 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'cde_commission_notification',
        percentage: 0.1,
        minAmount: 15_000,
        priority: 1,
      },
      {
        code: 'CDE_CONFIRMATION',
        label: 'Crédit documentaire export — commission de confirmation',
        description:
          '2% du montant + TAF, minimum 50 000 F CFA + TAF. Engagement de la banque de payer même en cas de défaillance de la banque émettrice.',
        type: RT.FEE,
        field: 'cde_commission_confirmation',
        percentage: 2,
        minAmount: 50_000,
        priority: 1,
      },
      {
        code: 'CDE_NEGOCIATION',
        label: 'Crédit documentaire export — commission de négociation',
        description: '0,20% du montant + TAF, minimum 15 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'cde_commission_negociation',
        percentage: 0.2,
        minAmount: 15_000,
        priority: 1,
      },
      {
        code: 'CDE_ENCAISSEMENT',
        label: "Crédit documentaire export — commission d'encaissement",
        description: '0,20% du montant + TAF, minimum 12 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'cde_commission_encaissement',
        percentage: 0.2,
        minAmount: 12_000,
        priority: 1,
      },
      {
        code: 'CDE_RAPATRIEMENT',
        label: 'Crédit documentaire export — commission de rapatriement',
        description:
          '0,125% du montant rapatrié + TAF, minimum 5 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'cde_commission_rapatriement',
        percentage: 0.125,
        minAmount: 5_000,
        priority: 1,
      },
    ],
  );

  // ── B-X : Autres services — Entreprises ───────────────────────────────────
  await upsertProduct(
    'AUTRES_SERVICES_ENT',
    'Autres Services (divers) — Entreprises',
    'Recherche de documents, renseignements, successions et saisies entreprises (B-X)',
    'MISC',
    'B-X',
    [
      {
        code: 'AE_RECHERCHE_0_90J',
        label: 'Frais de recherche de documents — 0 à 90 jours',
        description:
          '2 000 F CFA + TAF (mêmes tranches 0-30j, 30-60j, 60-90j).',
        type: RT.FEE,
        field: 'recherche_doc_0_90j_ent',
        flatAmount: 2_000,
        priority: 2,
      },
      {
        code: 'AE_RECHERCHE_SUP_1AN',
        label: "Frais de recherche de documents — plus d'un an",
        description:
          '5 000 F CFA + TAF (1–5 ans). Au-delà de 5 ans : 6 000 + 5 000 par année supplémentaire + TAF.',
        type: RT.FEE,
        field: 'recherche_doc_sup_1an_ent',
        flatAmount: 5_000,
        priority: 2,
      },
      {
        code: 'AE_PHOTOCOPIE',
        label: 'Supplément par photocopie',
        description: '25 F CFA par page.',
        type: RT.FEE,
        field: 'supplement_photocopie_ent',
        flatAmount: 25,
        priority: 3,
      },
      {
        code: 'AE_RENSEIGN_CLIENT',
        label: 'Demande de renseignements sur client',
        description: '25 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'renseignements_client_ent',
        flatAmount: 25_000,
        priority: 2,
      },
      {
        code: 'AE_RENSEIGN_COMMERCIAL',
        label: 'Demande de renseignements commerciaux',
        description: '25 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'renseignements_commercial_ent',
        flatAmount: 25_000,
        priority: 2,
      },
      {
        code: 'AE_RENSEIGN_FINANCIER',
        label: 'Demande de renseignements financiers',
        description: '25 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'renseignements_financiers_ent',
        flatAmount: 25_000,
        priority: 2,
      },
      {
        code: 'AE_RENSEIGN_COMPTABLE',
        label: 'Demande de renseignements comptables (CAC)',
        description: '25 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'renseignements_comptables_cac_ent',
        flatAmount: 25_000,
        priority: 2,
      },
      {
        code: 'AE_INFO_CAUTIONS',
        label: 'Information annuelle des cautions',
        description:
          'Franco (gratuit) — information obligatoire envoyée annuellement aux cautions.',
        type: RT.FEE,
        field: 'information_annuelle_cautions',
        flatAmount: 0,
        period: RP.YEARLY,
        priority: 3,
      },
      {
        code: 'AE_SUCCESSION_OUV',
        label: "Frais d'ouverture de dossier de succession entreprise",
        description: '25 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'succession_ouverture_dossier_ent',
        flatAmount: 25_000,
        priority: 2,
      },
      {
        code: 'AE_SUCCESSION_REGL',
        label: 'Frais de dossier succession au règlement',
        description: '25 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'succession_reglement_ent',
        flatAmount: 25_000,
        priority: 2,
      },
      {
        code: 'AE_SAISIE_ARRET',
        label: 'Frais de saisie-arrêt / ATD / opposition administrative',
        description: '15 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'frais_saisie_arret_atd_ent',
        flatAmount: 15_000,
        priority: 1,
      },
      {
        code: 'AE_LETTRE_INJONCTION',
        label: "Lettre d'injonction",
        description:
          '15 000 F CFA + TAF. Courrier de mise en demeure adressé au débiteur.',
        type: RT.FEE,
        field: 'lettre_injonction_ent',
        flatAmount: 15_000,
        priority: 1,
      },
      {
        code: 'AE_ATTESTATION_AVOIRS',
        label: "Attestation d'avoirs",
        description: '25 000 F CFA + TAF.',
        type: RT.FEE,
        field: 'attestation_avoirs_ent',
        flatAmount: 25_000,
        priority: 2,
      },
      {
        code: 'AE_CIRCULARISATION',
        label: 'Frais de circularisation',
        description:
          '30 000 F CFA + TAF. Réponse aux demandes de circularisation pour audit légal ou commissariat aux comptes.',
        type: RT.FEE,
        field: 'frais_circularisation_ent',
        flatAmount: 30_000,
        priority: 2,
      },
    ],
  );

  // ── Bilan ──────────────────────────────────────────────────────────────────
  console.log('\n✅  Seed v2 terminé avec succès !\n');

  const products = await prisma.bankProduct.findMany({
    include: { _count: { select: { rules: true } } },
    orderBy: { reference: 'asc' },
  });

  let totalRules = 0;
  for (const p of products) {
    console.log(
      `  [${p.reference?.padEnd(25)}] ${p.code.padEnd(30)} → ${p._count.rules} règles`,
    );
    totalRules += p._count.rules;
  }
  console.log(
    `\n  📦 ${products.length} produits  |  📐 ${totalRules} règles\n`,
  );

  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error('❌  Erreur fatale :', err);
  prisma.$disconnect();
  process.exit(1);
});
