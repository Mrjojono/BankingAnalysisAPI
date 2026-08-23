/**
 * SEED - Conditions Generales Orabank Togo 2024
 * Version v3 - Produits normalises (24 -> 12 produits)
 *
 * CHANGEMENTS v2 -> v3 :
 *   - 24 produits reduits a 12 par fusion / normalisation
 *   - Les regles ELIGIBILITY sont evaluees par le Moteur d'Eligibilite
 *   - Les conditions JSON (tiers de cartes, etc.) sont stockees dans BankProduct.conditions
 *   - Les regles de type FEE / INTEREST / LIMIT / VALUE_DATE restent dans Rule
 *
 * SECTION A - PARTICULIERS (8 produits) :
 *   1. COMPTE_CHEQUE_PART    <- COMPTES_PART + GESTION_COMPTE_PART + SERVICES_BANCAIRES_PART + INCIDENTS_PART
 *   2. COMPTE_EPARGNE_PART   <- COMPTES_PART (epargne/DAT) + GESTION_COMPTE_PART (taux epargne)
 *   3. CARTE_VISA_PART       <- VISA_LIBERTE + CLASSIC + PREMIER + PLATINUM + KEAZ (5 tiers)
 *   4. CHEQUES_PART          <- identique
 *   5. VIREMENTS_PART        <- identique
 *   6. CREDIT_CONSO_PART     <- identique
 *   7. CREDIT_HABITAT_PART   <- identique
 *   8. INTERNATIONAL_PART    <- CHANGE_PART + ETRANGER_PART
 *
 * SECTION B - ENTREPRISES (4 produits) :
 *   9.  COMPTE_ENT           <- COMPTES_ENT + GESTION_COMPTE_ENT
 *   10. CARTE_VISA_BUSINESS  <- identique
 *   11. CREDIT_ENT           <- CREDIT_TRESORERIE_ENT + CREDIT_SIGNATURE_ENT
 *   12. INTERNATIONAL_ENT    <- ETRANGER_ENT (identique)
 *
 * PRODUITS SUPPRIMES : BAD_PART, BAD_ENT, AUTRES_SERVICES_PART, AUTRES_SERVICES_ENT,
 *   EFFETS_COMMERCE_ENT, INCIDENTS_PART (incidents integres dans COMPTE_CHEQUE_PART)
 *
 * CONVENTIONS :
 *  - flatAmount: 0 + description: 'Franco'  -> operation gratuite
 *  - flatAmount: N + description: '...'      -> montant fixe HT (TAF = 10% en sus si mentionne)
 *  - percentage: P                           -> taux applique sur le montant (ex: 0.5 = 0,5%)
 *  - value / valueMin / valueMax             -> seuils numeriques pour ELIGIBILITY et LIMIT
 *  - weight (ELIGIBILITY seulement)          -> importance relative dans le scoring (total ~100)
 *  - priority (toutes regles)               -> ordre d'evaluation (1 = prioritaire)
 *  - TBB = Taux de Base Bancaire (variable)
 *  - MTD = Meilleur Taux Debiteur (= 8%)
 *  - TAF = Taxe sur Activite Financiere = 10% sur les commissions HT
 */

import 'dotenv/config';
import { PrismaClient, Prisma } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not defined');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

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

type RuleInput = {
  code: string;
  label: string;
  description?: string;
  type: string;
  field: string;
  operator?: string;
  value?: number;
  valueMin?: number;
  valueMax?: number;
  percentage?: number;
  flatAmount?: number;
  minAmount?: number;
  maxAmount?: number;
  currency?: string;
  period?: string;
  weight?: number;
  priority?: number;
  isActive?: boolean;
};

async function upsertProduct(
  code: string,
  name: string,
  description: string,
  category: string,
  reference: string,
  rules: RuleInput[],
  conditions?: Record<string, unknown>,
) {
  const product = await prisma.bankProduct.upsert({
    where: { code },
    update: {
      name,
      description,
      category,
      ...(conditions !== undefined ? { conditions: conditions as Prisma.InputJsonValue } : {}),
    },
    create: {
      code,
      name,
      description,
      category,
      reference,
      isActive: true,
      ...(conditions !== undefined ? { conditions: conditions as Prisma.InputJsonValue } : {}),
    },
  });

  for (const r of rules) {
    await prisma.rule.upsert({
      where: {
        productId_code: { productId: product.id, code: r.code },
      },
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

async function seed() {
  console.log(
    'Seeding Orabank Togo - Conditions Generales 2024 (v3 normalise)\n',
  );

  // =========================================================================
  // SECTION A - PARTICULIERS
  // =========================================================================

  // -- 1. COMPTE_CHEQUE_PART -------------------------------------------------
  await upsertProduct(
    'COMPTE_CHEQUE_PART',
    'Compte Cheque - Particuliers',
    'Compte courant et cheques particuliers : ouverture, cloture, gestion, value date, incidents (A-I)',
    'ACCOUNT',
    'A-I',
    [
      // -- ELIGIBILITE (profil financier) --
      { code: 'PART_ENDETTEMENT_MAX', label: "Taux d'endettement - plafond BCEAO", description: "Taux d'endettement maximal de 33% des revenus nets. Champ: ratio dette/revenu en pourcentage.", type: RT.ELIGIBILITY, field: 'debtRatio', operator: RO.LT, value: 33, weight: 35, priority: 1 },
      { code: 'PART_REVENU_MIN', label: 'Revenu mensuel net minimum', description: "Revenu mensuel net minimum de 200 000 F CFA requis pour ouverture compte cheques avec chequier.", type: RT.ELIGIBILITY, field: 'monthlyIncome', operator: RO.GTE, value: 200_000, weight: 30, priority: 2 },
      { code: 'PART_DECOUVERT_MAX', label: 'Jours de decouvert chronique - plafond', description: 'Maximum 15 jours/mois en decouvert en moyenne sur les 3 derniers mois.', type: RT.ELIGIBILITY, field: 'overdraftDays', operator: RO.LT, value: 15, weight: 20, priority: 3 },
      { code: 'PART_EPARGNE_MIN', label: "Score de regularite d'epargne minimum", description: "Score interne de regularite d'epargne (0-100). Minimum requis : 40/100.", type: RT.ELIGIBILITY, field: 'savingsRegularity', operator: RO.GTE, value: 40, weight: 15, priority: 4 },
      // -- OUVERTURE DE COMPTE --
      { code: 'OUV_CHEQUE', label: 'Ouverture compte cheques', description: 'Franco (gratuit, avec remise de la convention de compte)', type: RT.FEE, field: 'ouverture_cheque', flatAmount: 0, priority: 1 },
      { code: 'OUV_JOINT_CHEQUE', label: 'Ouverture compte joint - cheques', description: 'Franco (gratuit)', type: RT.FEE, field: 'ouverture_joint_cheque', flatAmount: 0, priority: 1 },
      { code: 'OUV_INDIVIS_CHEQUE', label: 'Ouverture compte indivis - cheques', description: 'Franco (gratuit)', type: RT.FEE, field: 'ouverture_indivis_cheque', flatAmount: 0, priority: 1 },
      { code: 'OUV_PACK_ETUDIANT', label: 'Ouverture Pack Etudiant - frais trimestriels', description: '1 000 F CFA par trimestre (HT)', type: RT.FEE, field: 'pack_etudiant', flatAmount: 1_000, period: RP.MONTHLY, priority: 1 },
      { code: 'OUV_DEPOT_INITIAL', label: "Depot initial a l'ouverture de compte", description: 'Franco - aucun depot initial obligatoire (hors DAT)', type: RT.FEE, field: 'depot_initial', flatAmount: 0, priority: 1 },
      // -- CLOTURE DE COMPTE --
      { code: 'CLO_CHEQUE', label: 'Cloture compte cheques', description: 'Franco (gratuit)', type: RT.FEE, field: 'cloture_cheque', flatAmount: 0, priority: 1 },
      { code: 'CLO_JOINT', label: 'Cloture compte joint', description: 'Franco (gratuit)', type: RT.FEE, field: 'cloture_joint', flatAmount: 0, priority: 1 },
      { code: 'CLO_INDIVIS', label: 'Cloture compte indivis', description: 'Franco (gratuit)', type: RT.FEE, field: 'cloture_indivis', flatAmount: 0, priority: 1 },
      { code: 'CLO_LETTRE_JURIDIQUE', label: 'Lettre de cloture juridique', description: 'Franco (gratuit)', type: RT.FEE, field: 'lettre_cloture_juridique', flatAmount: 0, priority: 1 },
      { code: 'CLO_ATTESTATION', label: 'Attestation de cloture de compte', description: 'Franco (gratuit)', type: RT.FEE, field: 'attestation_cloture', flatAmount: 0, priority: 1 },
      // -- TAUX DEBITEUR --
      { code: 'TAUX_DEBITEUR_MTD', label: 'Meilleur taux debiteur (MTD)', description: "8% l'an + TAF. Taux de reference pour les taux debiteurs. Taux annuel HT.", type: RT.INTEREST, field: 'taux_debiteur_annuel', percentage: 8, period: RP.YEARLY, priority: 1 },
      // -- GESTION DE COMPTE (conditions debitrices) --
      { code: 'COM_PLUS_FORT_DECOUVERT', label: 'Commission de plus fort decouvert (mensuelle)', description: '0,05% du plus fort decouvert du mois + TAF, minimum 500 F CFA + TAF.', type: RT.FEE, field: 'com_plus_fort_decouvert', percentage: 0.05, minAmount: 500, period: RP.MONTHLY, priority: 2 },
      { code: 'COM_MVT_DEBIT_CHEQUIER', label: 'Commission mouvement debit - avec chequier', description: 'Franco (gratuit) - exonere pour les clients detenteurs d\'un chequier', type: RT.FEE, field: 'com_mvt_debit_chequier', flatAmount: 0, priority: 2 },
      { code: 'COM_MVT_DEBIT_GUICHET', label: 'Commission mouvement debit - cheque de guichet', description: '1 000 F CFA + TAF par operation de retrait sur cheque de guichet (sans chequier)', type: RT.FEE, field: 'com_mvt_debit_guichet', flatAmount: 1_000, priority: 2 },
      { code: 'COM_MVT_DEBIT_TIRAGE', label: 'Commission mouvement - paiement cheque tirage', description: 'Franco (gratuit) - paiement de cheques tires sur la banque correspondante', type: RT.FEE, field: 'com_mvt_debit_tirage', flatAmount: 0, priority: 2 },
      { code: 'COM_DEPASSEMENT_AUTORISE', label: 'Commission de depassement - compte autorise', description: '0,5% du montant du depassement + TAF.', type: RT.FEE, field: 'com_depassement_autorise', percentage: 0.5, priority: 2 },
      { code: 'COM_DEPASSEMENT_NON_AUTORISE', label: 'Commission de depassement - compte non autorise', description: '0,5% du montant du depassement + TAF.', type: RT.FEE, field: 'com_depassement_non_autorise', percentage: 0.5, priority: 2 },
      { code: 'FRAIS_TENUE_COMPTE_MENSUEL', label: 'Frais de tenue de compte cheques (mensuel)', description: '1 000 F CFA + TAF par mois.', type: RT.FEE, field: 'frais_tenue_compte_mensuel', flatAmount: 1_000, period: RP.MONTHLY, priority: 1 },
      { code: 'ARRETE_COMPTE_MENSUEL', label: 'Arrete de compte mensuel', description: 'Franco (gratuit)', type: RT.FEE, field: 'arrete_compte_mensuel', flatAmount: 0, priority: 1 },
      { code: 'RIB', label: "Releve d'Identite Bancaire (RIB)", description: 'Franco (gratuit)', type: RT.FEE, field: 'rib', flatAmount: 0, priority: 1 },
      // -- RELEVES --
      { code: 'RELEVE_MENSUEL', label: 'Releve de compte mensuel', description: 'Franco (gratuit)', type: RT.FEE, field: 'releve_mensuel', flatAmount: 0, priority: 1 },
      { code: 'RELEVE_DEMANDE_INF_1AN', label: 'Releve a la demande - inferieur a 1 an', description: '5 000 F CFA + TAF par releve demande.', type: RT.FEE, field: 'releve_demande_inf_1an', flatAmount: 5_000, priority: 2 },
      { code: 'RELEVE_DEMANDE_SUP_1AN', label: 'Releve a la demande - superieur a 1 an (par annee)', description: "6 000 F CFA x nombre d'annees + TAF.", type: RT.FEE, field: 'releve_demande_sup_1an', flatAmount: 6_000, priority: 2 },
      { code: 'RELEVE_FRAIS_ANNUELS', label: 'Releve recapitulatif annuel des frais', description: 'Franco (gratuit)', type: RT.FEE, field: 'releve_frais_annuels', flatAmount: 0, priority: 1 },
      // -- ATTESTATIONS --
      { code: 'ATTEST_SOLDE', label: 'Attestation de solde', description: '30 000 F CFA (HT).', type: RT.FEE, field: 'attestation_solde', flatAmount: 30_000, priority: 2 },
      { code: 'ATTEST_NON_ENGAGEMENT', label: 'Attestation de non-engagement', description: '100 000 F CFA + TAF.', type: RT.FEE, field: 'attestation_non_engagement', flatAmount: 100_000, priority: 2 },
      { code: 'ATTEST_ENGAGEMENT', label: "Attestation d'engagement", description: '60 000 F CFA + TAF.', type: RT.FEE, field: 'attestation_engagement', flatAmount: 60_000, priority: 2 },
      { code: 'ATTEST_DEDUCTIBILITE', label: 'Attestation de deductibilite fiscale', description: '25 000 F CFA + TAF.', type: RT.FEE, field: 'attestation_deductibilite', flatAmount: 25_000, priority: 2 },
      { code: 'ATTEST_COMPTE', label: 'Attestation de compte', description: '30 000 F CFA + TAF.', type: RT.FEE, field: 'attestation_compte', flatAmount: 30_000, priority: 2 },
      { code: 'ATTEST_CAUTION_SOLIDAIRE', label: 'Attestation de caution solidaire', description: '30 000 F CFA + TAF.', type: RT.FEE, field: 'attestation_caution_solidaire', flatAmount: 30_000, priority: 2 },
      { code: 'ATTEST_SOLDE_ANTICIPATION', label: 'Attestation de solde par anticipation', description: 'Franco (gratuit)', type: RT.FEE, field: 'attestation_solde_anticipation', flatAmount: 0, priority: 2 },
      // -- DIVERS --
      { code: 'FRAIS_TIMBRE_VERSEMENT', label: "Frais de timbre fiscal pour versement d'especes", description: '100 F CFA par operation.', type: RT.FEE, field: 'frais_timbre_versement', flatAmount: 100, priority: 3 },
      { code: 'FRAIS_PROCURATION', label: 'Frais pour procuration sur compte', description: 'Franco (gratuit)', type: RT.FEE, field: 'frais_procuration', flatAmount: 0, priority: 3 },
      // -- DATE DE VALEUR --
      { code: 'DV_VIREMENTS_RECUS', label: 'Date de valeur - virements recus', description: 'J - credit le jour meme.', type: RT.VALUE_DATE, field: 'dv_virements_recus', value: 0, priority: 1 },
      { code: 'DV_REMISE_CHQ_ORABANK', label: 'Date de valeur - remise cheque guichet Orabank', description: 'J+1 - credit le lendemain ouvre.', type: RT.VALUE_DATE, field: 'dv_remise_cheque_orabank', value: 1, priority: 1 },
      { code: 'DV_REMISE_CHQ_AUTRES', label: 'Date de valeur - remise cheque autres banques', description: 'J+2 - credit 2 jours ouvres apres remise.', type: RT.VALUE_DATE, field: 'dv_remise_cheque_autres_banques', value: 2, priority: 1 },
      { code: 'DV_VIREMENTS_EMIS', label: 'Date de valeur - virements emis', description: 'J-1 - debits passes en valeur la veille ouvree.', type: RT.VALUE_DATE, field: 'dv_virements_emis', value: -1, priority: 1 },
      { code: 'DV_ESPECES', label: "Date de valeur - especes", description: 'J - operations en valeur le jour meme.', type: RT.VALUE_DATE, field: 'dv_especes', value: 0, priority: 1 },
      // -- SERVICES BANCAIRES --
      { code: 'SB_DEPOT_ESPECES', label: "Depot d'especes en agence", description: 'Franco (gratuit, hors timbre 100 F CFA)', type: RT.FEE, field: 'depot_especes_agence', flatAmount: 0, priority: 1 },
      { code: 'SB_RETRAIT_ESPECES', label: "Retrait d'especes en agence", description: 'Franco (gratuit)', type: RT.FEE, field: 'retrait_especes_agence', flatAmount: 0, priority: 1 },
      { code: 'SB_CHQ_BANQUE_FCFA', label: 'Emission cheque de banque en F CFA', description: 'Franco (gratuit)', type: RT.FEE, field: 'emission_cheque_banque_fcfa', flatAmount: 0, priority: 1 },
      { code: 'SB_CIRCULARISATION', label: 'Frais de circularisation', description: 'Franco (gratuit)', type: RT.FEE, field: 'frais_circularisation', flatAmount: 0, priority: 3 },
      { code: 'SB_CHANGEMENT_SIGN', label: 'Changement de signature sur compte', description: 'Franco (gratuit).', type: RT.FEE, field: 'changement_signature', flatAmount: 0, priority: 3 },
      { code: 'SB_MODIF_INTITULE', label: "Modification d'intitule de compte", description: 'Franco (gratuit).', type: RT.FEE, field: 'modification_intitule', flatAmount: 0, priority: 3 },
      { code: 'SB_NANTISSEMENT', label: 'Frais de nantissement', description: 'Au reel - frais recuperes selon justificatifs.', type: RT.FEE, field: 'frais_nantissement', flatAmount: 0, priority: 3 },
      // -- INCIDENTS (services bancaires) --
      { code: 'SB_REJET_CHEQUE', label: 'Rejet de cheque impaye', description: "7 000 F CFA + TAF par cheque rejeté. + 7 500 F CFA + TAF si lettre d'injonction.", type: RT.FEE, field: 'rejet_cheque_impaye', flatAmount: 7_000, priority: 1 },
      { code: 'SB_OPPOSITION', label: "Demande d'opposition (cheque/chequier)", description: '10 000 F CFA + TAF.', type: RT.FEE, field: 'demande_opposition', flatAmount: 10_000, priority: 1 },
      { code: 'SB_ATD_SAISIE', label: 'Incident sur compte - ATD / Saisie-arret', description: '15 000 F CFA + TAF.', type: RT.FEE, field: 'frais_atd_saisie_arret', flatAmount: 15_000, priority: 1 },
      { code: 'SB_SAISIE_ATTRIBUTION', label: 'Frais de saisie attribution ATD', description: '15 000 F CFA + TAF.', type: RT.FEE, field: 'frais_saisie_attribution', flatAmount: 15_000, priority: 1 },
      // -- INCIDENTS DE PAIEMENT --
      { code: 'INC_DECL_OPPOSITION_BC', label: "Declaration d'opposition a la BCEAO", description: 'Franco (gratuit)', type: RT.FEE, field: 'declaration_opposition_bceao', flatAmount: 0, priority: 1 },
      { code: 'INC_MAINLEVEE_BC', label: "Mainlevee d'opposition Banque Centrale", description: 'Franco (gratuit)', type: RT.FEE, field: 'mainlevee_opposition_bceao', flatAmount: 0, priority: 1 },
      { code: 'INC_RELANCE_SIMPLE', label: 'Lettre de relance - pli simple', description: 'Franco (gratuit)', type: RT.FEE, field: 'relance_debiteur_pli_simple', flatAmount: 0, priority: 2 },
      { code: 'INC_RELANCE_RECOMM', label: 'Lettre de relance - pli recommande', description: 'Au reel - frais recuperes au cout postal.', type: RT.FEE, field: 'relance_debiteur_recommande', flatAmount: 0, priority: 2 },
      { code: 'INC_DECL_CIP', label: 'Declaration a la CIP', description: '7 500 F CFA + TAF.', type: RT.FEE, field: 'declaration_cip_bceao', flatAmount: 7_500, priority: 1 },
      { code: 'INC_INFO_PREALABLE', label: "Information prealable au rejet de cheque", description: 'Franco (gratuit)', type: RT.FEE, field: 'info_prealable_rejet_cheque', flatAmount: 0, priority: 1 },
      { code: 'INC_CERTIFICAT_NP', label: 'Certificat de non-paiement', description: 'Franco (gratuit)', type: RT.FEE, field: 'certificat_non_paiement', flatAmount: 0, priority: 2 },
    ],
  );

  // 2. COMPTE_EPARGNE_PART
  await upsertProduct(
    'COMPTE_EPARGNE_PART',
    'Compte Epargne - Particuliers',
    'Compte epargne, depot a terme (DAT), bon de caisse et taux credits particuliers (A-I)',
    'ACCOUNT',
    'A-I-EPARGNE',
    [
      { code: 'OUV_DAT_DEPOT_MIN', label: 'Depot a terme - depot initial minimum', description: "Montant minimum d'ouverture d'un DAT : 5 000 000 F CFA (source 1.1.1.3)", type: RT.ELIGIBILITY, field: 'dat_depot_initial', operator: RO.GTE, value: 5_000_000, weight: 100, priority: 1 },
      { code: 'DAT_MONTANT_MIN', label: 'Depot a terme - montant minimum requis', description: '5 000 000 F CFA minimum. Duree minimum 3 mois. Taux selon grille DAT en vigueur.', type: RT.ELIGIBILITY, field: 'dat_montant', operator: RO.GTE, value: 5_000_000, weight: 60, priority: 1 },
      { code: 'DAT_DUREE_MIN_MOIS', label: 'Depot a terme - duree minimale (mois)', description: "Duree minimum de 3 mois. En dessous, le DAT n'est pas ouvert.", type: RT.ELIGIBILITY, field: 'dat_duree_mois', operator: RO.GTE, value: 3, weight: 40, priority: 2 },
      { code: 'BON_CAISSE_DUREE_MIN', label: 'Bon de caisse - duree minimale (mois)', description: "Duree minimum de 6 mois. Taux d'interet : 2% l'an.", type: RT.ELIGIBILITY, field: 'bon_caisse_duree_mois', operator: RO.GTE, value: 6, weight: 100, priority: 1 },
      { code: 'OUV_EPARGNE', label: 'Ouverture compte epargne simple', description: 'Franco (gratuit)', type: RT.FEE, field: 'ouverture_epargne', flatAmount: 0, priority: 1 },
      { code: 'OUV_LIVRET', label: 'Ouverture compte sur livret (avec delivrance du livret)', description: 'Franco (gratuit)', type: RT.FEE, field: 'ouverture_livret', flatAmount: 0, priority: 1 },
      { code: 'OUV_CEG', label: 'Ouverture Compte Epargne Garantie (CEG)', description: 'Franco (gratuit)', type: RT.FEE, field: 'ouverture_ceg', flatAmount: 0, priority: 1 },
      { code: 'OUV_JOINT_EPARGNE', label: 'Ouverture compte joint - epargne', description: 'Franco (gratuit)', type: RT.FEE, field: 'ouverture_joint_epargne', flatAmount: 0, priority: 1 },
      { code: 'OUV_INDIVIS_EPARGNE', label: 'Ouverture compte indivis - epargne', description: 'Franco (gratuit)', type: RT.FEE, field: 'ouverture_indivis_epargne', flatAmount: 0, priority: 1 },
      { code: 'CLO_EPARGNE', label: 'Cloture compte epargne simple', description: 'Franco (gratuit)', type: RT.FEE, field: 'cloture_epargne', flatAmount: 0, priority: 1 },
      { code: 'CLO_DAT', label: 'Cloture depot a terme', description: 'Franco (gratuit)', type: RT.FEE, field: 'cloture_dat', flatAmount: 0, priority: 1 },
      { code: 'CLO_LIVRET', label: 'Cloture compte sur livret', description: 'Franco (gratuit)', type: RT.FEE, field: 'cloture_livret', flatAmount: 0, priority: 1 },
      { code: 'TAUX_EPARGNE_SIMPLE', label: 'Taux crediteur compte epargne simple', description: "3,5% l'an, sans taxe sur les interests jusqu'a 10 000 000 F CFA de capital.", type: RT.INTEREST, field: 'taux_epargne_simple', percentage: 3.5, period: RP.YEARLY, priority: 1 },
      { code: 'TAUX_EPARGNE_CONTRAT_BONUS', label: 'Taux crediteur compte epargne contrat bonus', description: "4,5% l'an. Produit d'epargne contractuelle avec versements reguliers et prime de fidelite.", type: RT.INTEREST, field: 'taux_epargne_contrat_bonus', percentage: 4.5, period: RP.YEARLY, priority: 1 },
      { code: 'TAUX_CEG', label: 'Taux crediteur Compte Epargne Garantie (CEG)', description: "3,75% l'an. Compte epargne avec capital garanti par la banque.", type: RT.INTEREST, field: 'taux_ceg', percentage: 3.75, period: RP.YEARLY, priority: 1 },
      { code: 'TAUX_PLANS_EPARGNE', label: "Taux crediteur plans d'epargne contractuelle", description: "4,5% l'an pour les plans d'epargne logement, epargne actions et produits contractuels.", type: RT.INTEREST, field: 'taux_plans_epargne', percentage: 4.5, period: RP.YEARLY, priority: 1 },
      { code: 'BON_CAISSE_TAUX', label: "Bon de caisse - taux d'interet annuel", description: "2% l'an. Titre de creance negociable emis par la banque pour une duree minimum de 6 mois.", type: RT.INTEREST, field: 'taux_bon_caisse', percentage: 2, period: RP.YEARLY, priority: 1 },
      { code: 'FRAIS_TENUE_LIVRET', label: "Frais de tenue de compte sur livret d'epargne", description: 'Franco (gratuit)', type: RT.FEE, field: 'frais_tenue_livret', flatAmount: 0, priority: 1 },
      { code: 'DATE_VALEUR_CREDITRICE', label: 'Date de valeur - conditions creditrices', description: 'J+1 : les montants verses (hors especes) sont credites avec une date de valeur au lendemain ouvre.', type: RT.VALUE_DATE, field: 'date_valeur_creditrice', value: 1, priority: 1 },
    ],
  );

  // 3. CARTE_VISA_PART
  await upsertProduct(
    'CARTE_VISA_PART',
    'Cartes Visa - Particuliers',
    'Gamme de cartes Visa particuliers : Prepayee Liberte, Classic, Premier, Platinum, KEAZ (A-II 2.2.2.1.5)',
    'CARD',
    'A-II-2.2.2.1.5',
    [
      // -- Regles communes a tous les tiers --
      { code: 'CV_VALIDITE_ANS', label: 'Duree de validite de la carte', description: '3 ans a compter de la date d emission.', type: RT.LIMIT, field: 'validite_annees', value: 3, priority: 1 },
      { code: 'CV_NB_TX_JOUR', label: 'Nombre maximum de transactions journalieres', description: '10 transactions maximum par jour (GAB + TPE cumules).', type: RT.LIMIT, field: 'nb_transactions_jour', operator: RO.LTE, value: 10, priority: 1 },
      { code: 'CV_RETRAIT_DAB_ORABANK', label: 'Retrait au DAB Orabank', description: 'Franco (gratuit)', type: RT.FEE, field: 'retrait_dab_orabank', flatAmount: 0, priority: 1 },
      { code: 'CV_RETRAIT_DAB_GIM', label: 'Retrait au DAB GIM-UEMOA', description: '500 F CFA par retrait.', type: RT.FEE, field: 'retrait_dab_gim_uemoa', flatAmount: 500, priority: 1 },
      { code: 'CV_RETRAIT_DAB_HORS_PAYS', label: 'Retrait au DAB hors pays', description: '2% du montant + TAF.', type: RT.FEE, field: 'retrait_dab_hors_pays', percentage: 2, priority: 1 },
      { code: 'CV_ANNULATION', label: 'Annulation de la carte', description: '10 000 F CFA.', type: RT.FEE, field: 'annulation_carte', flatAmount: 10_000, priority: 2 },
      { code: 'CV_REFECTION', label: 'Refexion de la carte', description: '12 000 F CFA (hors defaute imputable a la banque).', type: RT.FEE, field: 'refection_carte', flatAmount: 12_000, priority: 2 },
      { code: 'CV_REEDITION_CODE', label: 'Reedition du code PIN', description: '2 000 F CFA + TAF.', type: RT.FEE, field: 'reedition_code_pin', flatAmount: 2_000, priority: 3 },
      { code: 'CV_COMMANDE_EXPRESS', label: 'Commande express', description: '25 000 F CFA.', type: RT.FEE, field: 'commande_express', flatAmount: 25_000, priority: 3 },
      { code: 'CV_LIVRAISON_DHL', label: 'Livraison DHL', description: '25 000 F CFA.', type: RT.FEE, field: 'livraison_dhl', flatAmount: 25_000, priority: 3 },
    ],
    // -- Conditions JSON : tiers de la gamme Visa --
    {
      tiers: [
        {
          name: 'Liberte',
          code: 'VL',
          description: 'Carte Visa Prepayee - entree de gamme, rechargeable, sans compte courant obligatoire',
          acquisition: 12_000,
          abonnement_mensuel: 0,
          recharge_min: 25_000,
          charge_max: 2_000_000,
          retrait_gab_max_jour: 1_000_000,
          paiement_tpe_max_jour: 2_000_000,
          frais_chargement_pct: 1.5,
          frais_chargement_min: 1_000,
          frais_transfert_carte_pct: 1.5,
          frais_transfert_carte_min: 1_000,
          renouvellement: 12_000,
          opposition: 2_000,
          relevement_1mois: 0,
          relevement_indefini: 0,
          sa_retrait_dab_hors_uemoa: null,
          releve_mensuel: 'Franco',
          mbws_sms: 'Franco',
        },
        {
          name: 'Classic',
          code: 'VC',
          description: 'Carte Visa Classic - debite sur compte cheques, gamme standard',
          acquisition: 0,
          abonnement_mensuel: 2_000,
          retrait_gab_max_jour: 500_000,
          paiement_tpe_max_jour: 1_000_000,
          opposition: 2_000,
          relevement_1mois: 5_000,
          relevement_indefini: 15_000,
        },
        {
          name: 'Premier',
          code: 'VP',
          description: 'Carte Visa Premier - gamme premium avec plafonds eleves',
          acquisition: 0,
          abonnement_mensuel: 7_500,
          retrait_gab_max_jour: 1_000_000,
          paiement_tpe_max_jour: 2_000_000,
          opposition: 5_000,
          relevement_1mois: 5_000,
          relevement_indefini: 15_000,
        },
        {
          name: 'Platinum',
          code: 'VPL',
          description: 'Carte Visa Platinum - gamme haut de gamme, plafonds les plus eleves',
          acquisition: 0,
          abonnement_mensuel: 12_500,
          retrait_gab_max_jour: 3_000_000,
          paiement_tpe_max_jour: 5_000_000,
          opposition: 5_000,
          relevement_1mois: 5_000,
          relevement_indefini: 15_000,
        },
        {
          name: 'KEAZ',
          code: 'VK',
          description: 'Carte Visa KEAZ - economique, plafonds mensuels',
          acquisition: 0,
          abonnement_mensuel: 900,
          retrait_gab_max_mois: 150_000,
          paiement_tpe_max_mois: 150_000,
          opposition: 5_000,
          relevement_1mois: 5_000,
          relevement_indefini: 15_000,
        },
      ],
    },
  );

  // 4. CHEQUES_PART
  await upsertProduct(
    'CHEQUES_PART',
    'Cheques - Particuliers',
    'Delivrance, certification, opposition, rejet et encaissement de cheques particuliers (A-II 2.2.1)',
    'PAYMENT',
    'A-II-2.2.1',
    [
      { code: 'CHQ_BARRES', label: 'Cheques barres non endossables (chequier standard)', description: 'Franco (gratuit) - delivrance du chequier standard a barrement general', type: RT.FEE, field: 'cheque_barre', flatAmount: 0, priority: 1 },
      { code: 'CHQ_NON_BARRE', label: 'Cheques non barres / vignette', description: '25 F CFA par feuillet. Cheque non barre endossable (vignette fiscale incluse).', type: RT.FEE, field: 'cheque_non_barre', flatAmount: 25, priority: 1 },
      { code: 'CHQ_LETTRE', label: 'Lettre-cheques', description: 'Au prix de revient - facturation au cout reel dimpression et denvoi', type: RT.FEE, field: 'lettre_cheque', flatAmount: 0, priority: 1 },
      { code: 'CHQ_BANQUE_PLACE', label: 'Cheque de banque sur place', description: '5 000 F CFA + TAF. Cheque emis par la banque sur elle-meme, payable dans la meme place bancaire.', type: RT.FEE, field: 'cheque_banque_place', flatAmount: 5_000, priority: 1 },
      { code: 'CHQ_BANQUE_UEMOA', label: 'Cheque de banque UEMOA', description: '5 000 F CFA + TAF. Cheque de banque payable dans la zone UEMOA.', type: RT.FEE, field: 'cheque_banque_uemoa', flatAmount: 5_000, priority: 1 },
      { code: 'CHQ_GUICHET', label: 'Cheque de guichet (retrait sans chequier)', description: '1 000 F CFA + TAF. Cheque delivre au guichet pour un retrait ponctuel sans chequier.', type: RT.FEE, field: 'cheque_guichet', flatAmount: 1_000, priority: 1 },
      { code: 'CHQ_CERTIFICATION', label: 'Certification de cheque', description: '5 000 F CFA + TAF. La banque certifie la provision du cheque et la bloque pendant 8 jours.', type: RT.FEE, field: 'certification_cheque', flatAmount: 5_000, priority: 2 },
      { code: 'CHQ_ANNULATION_BANQUE', label: 'Annulation de cheque de banque', description: 'Franco (gratuit)', type: RT.FEE, field: 'annulation_cheque_banque', flatAmount: 0, priority: 2 },
      { code: 'CHQ_OPPOSITION', label: 'Opposition sur cheque ou chequier par lemetteur', description: '10 000 F CFA + TAF. Mise en opposition suite a perte, vol ou utilisation frauduleuse.', type: RT.FEE, field: 'opposition_cheque', flatAmount: 10_000, priority: 1 },
      { code: 'CHQ_OPPOSITION_RENOUV', label: 'Renouvellement dopposition sur cheque/chequier', description: 'Franco (gratuit) - renouvellement annuel de lopposition deja enregistree', type: RT.FEE, field: 'renouvellement_opposition', flatAmount: 0, priority: 2 },
      { code: 'CHQ_DESTRUCTION_25', label: 'Frais de destruction de chequier 25 feuillets', description: '2 000 F CFA + TAF par chequier de 25 feuillets detruit a la demande du client.', type: RT.FEE, field: 'destruction_chequier_25', flatAmount: 2_000, priority: 3 },
      { code: 'CHQ_DESTRUCTION_50', label: 'Frais de destruction de chequier 50 feuillets', description: '3 000 F CFA + TAF par chequier de 50 feuillets detruit a la demande du client.', type: RT.FEE, field: 'destruction_chequier_50', flatAmount: 3_000, priority: 3 },
      { code: 'CHQ_REJET_IMPAYE', label: 'Rejet de cheque impaye (absence ou insuffisance de provision)', description: "7 000 F CFA + TAF par cheque rejete. Si lettre dinjonction associee : 7 500 F CFA + TAF.", type: RT.FEE, field: 'rejet_cheque_impaye', flatAmount: 7_000, priority: 1 },
      { code: 'CHQ_LETTRE_INJONCTION', label: 'Lettre dinjonction sur rejet de cheque impaye', description: "7 500 F CFA + TAF. Lettre reglementaire envoyee au tireur suite a un cheque impaye. Sajoute aux frais de rejet.", type: RT.FEE, field: 'lettre_injonction_cheque', flatAmount: 7_500, priority: 1 },
      { code: 'CHQ_EXPEDITION_SIMPLE', label: 'Expedition de chequier a domicile - pli simple', description: '1 000 F CFA + TAF + tarif courrier en vigueur. Envoi postal standard.', type: RT.FEE, field: 'expedition_chequier_simple', flatAmount: 1_000, priority: 3 },
      { code: 'CHQ_EXPEDITION_RECOMM', label: 'Expedition de chequier a domicile - pli recommande', description: "5 000 F CFA + frais reels denvoi recommande. Pour envoi a letranger ou sur demande specifique.", type: RT.FEE, field: 'expedition_chequier_recomm', flatAmount: 5_000, priority: 3 },
      { code: 'CHQ_ENCAISSEMENT_UEMOA', label: 'Encaissement de cheques dans lUEMOA', description: "Franco (gratuit). Date de valeur J+2. En cas dimpaye : 7 000 F CFA par cheque retourne.", type: RT.FEE, field: 'encaissement_cheque_uemoa', flatAmount: 0, priority: 1 },
      { code: 'CHQ_ENCAISSEMENT_HORS_UEMOA', label: 'Encaissement de cheques hors UEMOA', description: "Date de valeur : 45 jours. En cas dimpaye : 7 000 F CFA + TAF + recuperation des frais denvoi et frais correspondant.", type: RT.FEE, field: 'encaissement_cheque_hors_uemoa', flatAmount: 7_000, priority: 1 },
    ],
  );

  // 5. VIREMENTS_PART
  await upsertProduct(
    'VIREMENTS_PART',
    'Virements et Prelevements - Particuliers',
    'Virements internes, UEMOA, SWIFT et prelevements pour particuliers (A-II 2.2.3)',
    'PAYMENT',
    'A-II-2.2.3',
    [
      { code: 'VIR_DOMICIL_SALAIRE', label: 'Domiciliation de salaries', description: 'Franco (gratuit) - mise en place de la domiciliation de salaire sur le compte Orabank.', type: RT.FEE, field: 'domiciliation_salaire', flatAmount: 0, priority: 1 },
      { code: 'VIR_INTERNE', label: 'Virement interne (compte a compte meme banque)', description: 'Franco (gratuit) - virement entre deux comptes Orabank, recu ou emis.', type: RT.FEE, field: 'virement_interne', flatAmount: 0, priority: 1 },
      { code: 'VIR_SUR_PLACE_TIERS', label: 'Virement sur place vers un tiers (STAR-UEMOA)', description: "2 000 F CFA + TAF. Virement vers un compte dune autre banque de la meme ville via le systeme STAR-UEMOA.", type: RT.FEE, field: 'virement_sur_place_tiers', flatAmount: 2_000, priority: 1 },
      { code: 'VIR_INTER_AGENCES', label: "Virement entre agences Orabank en faveur d'un tiers", description: 'Franco (gratuit) - virement entre agences du reseau Orabank.', type: RT.FEE, field: 'virement_inter_agences', flatAmount: 0, priority: 1 },
      { code: 'VIR_UEMOA', label: 'Virement dans la zone UEMOA (STAR-UEMOA)', description: "15 000 F CFA + TAF. Virement vers un compte bancaire dans lespace UEMOA (Benin, Burkina, CI, Guinee-Bissau, Mali, Niger, Senegal, Togo).", type: RT.FEE, field: 'virement_uemoa', flatAmount: 15_000, priority: 1 },
      { code: 'VIR_ENCAISSEMENT_RECU', label: 'Encaissement de virements recus (nationaux, communautaires, internationaux)', description: 'Franco (gratuit) - aucuns frais pour les virements recus, quelle que soit leur origine.', type: RT.FEE, field: 'encaissement_virement_recu', flatAmount: 0, priority: 1 },
      { code: 'VIR_PERMANENT_CREATION', label: 'Virement permanent - creation du dossier', description: "Franco (gratuit) - mise en place initiale d'un virement automatique recurrent.", type: RT.FEE, field: 'virement_permanent_creation', flatAmount: 0, priority: 2 },
      { code: 'VIR_PERMANENT_EXEC', label: 'Virement permanent - execution (par operation)', description: 'Franco (gratuit) - chaque execution du virement permanent est gratuite.', type: RT.FEE, field: 'virement_permanent_execution', flatAmount: 0, priority: 2 },
      { code: 'VIR_PERMANENT_MODIF', label: "Modification d'un virement permanent", description: 'Franco (gratuit) - modification du beneficiaire, montant ou periodicite.', type: RT.FEE, field: 'virement_permanent_modification', flatAmount: 0, priority: 2 },
      { code: 'VIR_MISE_DISPO_ORABANK', label: 'Mise a disposition de fonds - reseau Orabank', description: "5 000 F CFA + TAF. Mise a disposition despèces dans une agence Orabank pour un beneficiaire.", type: RT.FEE, field: 'mise_dispo_reseau_orabank', flatAmount: 5_000, priority: 2 },
      { code: 'VIR_MISE_DISPO_UEMOA', label: 'Mise a disposition de fonds - zone UEMOA', description: '15 000 F CFA + TAF. Mise a disposition dans une autre banque UEMOA.', type: RT.FEE, field: 'mise_dispo_uemoa', flatAmount: 15_000, priority: 2 },
      { code: 'PREL_CREATION', label: 'Prelevement automatique - creation du dossier', description: 'Franco (gratuit) - autorisation de prelevement accordee a un creancier.', type: RT.FEE, field: 'prelevement_creation', flatAmount: 0, priority: 2 },
      { code: 'PREL_EXEC', label: 'Prelevement automatique - execution', description: 'Franco (gratuit) - chaque execution de prelevement est gratuite.', type: RT.FEE, field: 'prelevement_execution', flatAmount: 0, priority: 2 },
      { code: 'PREL_OPPOSITION', label: 'Opposition sur avis de prelevement', description: 'Franco (gratuit) - revocation ou opposition a un prelevement.', type: RT.FEE, field: 'prelevement_opposition', flatAmount: 0, priority: 2 },
    ],
  );

  // 6. CREDIT_CONSO_PART
  await upsertProduct(
    'CREDIT_CONSO_PART',
    'Credit a la Consommation - Particuliers',
    'Decouverts formalises, facilites de caisse, credits court terme particuliers (A-VII 7.1)',
    'LOAN',
    'A-VII-7.1',
    [
      { code: 'CC_DECOUVERT_PLAFOND_PCT', label: 'Decouvert formalise - plafond en % du salaire net domocilie', description: "Plafond = 25% du salaire net domocilie, avec un maximum absolu de 1 000 000 F CFA. Necessite une domociliation ferme et irrevoxable du salaire.", type: RT.LIMIT, field: 'decouvert_pct_salaire', operator: RO.LTE, value: 25, priority: 1 },
      { code: 'CC_DECOUVERT_PLAFOND_MAX', label: 'Decouvert formalise - plafond maximum absolu', description: 'Plafond maximum de 1 000 000 F CFA quel que soit le salaire.', type: RT.LIMIT, field: 'decouvert_montant_max', operator: RO.LTE, value: 1_000_000, priority: 1 },
      { code: 'CC_DECOUVERT_FRAIS_DOSSIER', label: 'Decouvert formalise - frais de dossier', description: '5 000 F CFA + TAF a la mise en place initiale ou au renouvellement.', type: RT.FEE, field: 'frais_dossier_decouvert', flatAmount: 5_000, priority: 1 },
      { code: 'CC_DECOUVERT_DUREE_MOIS', label: 'Decouvert formalise - duree de la convention', description: '12 mois renouvelable. La convention de decouvert est valable 1 an, renouvelable par tacite reconduction.', type: RT.LIMIT, field: 'decouvert_duree_mois', operator: RO.LTE, value: 12, priority: 2 },
      { code: 'CC_DECOUVERT_TAUX', label: "Decouvert formalise - taux d'interet annuel", description: "13% l'an + TAF. Taux fixe applique sur le montant utilise du decouvert autorise.", type: RT.INTEREST, field: 'taux_decouvert_formel', percentage: 13, period: RP.YEARLY, priority: 1 },
      { code: 'CC_DEPASSEMENT_TAUX_MARGE', label: 'Decouvert non formalise - taux (MTD + marge)', description: "MTD + 2,5 points, sans depasser 14,95% l'an. Applique sur le montant en depassement de decouvert non autorise. MTD actuel = 8%, donc taux applicable = 10,5% (plafonne a 14,95%).", type: RT.INTEREST, field: 'taux_depassement_non_formel', percentage: 2.5, maxAmount: 14.95, period: RP.YEARLY, priority: 1 },
      { code: 'CC_DEPASSEMENT_COM', label: 'Decouvert non formalise - commission de depassement', description: '0,5% Flat du montant en depassement, minimum 5 F CFA. Prelevee a chaque incident.', type: RT.FEE, field: 'commission_depassement_non_formel', percentage: 0.5, minAmount: 5, priority: 2 },
      { code: 'CC_PLUS_FORT_DECOUVERT', label: 'Commission de plus fort decouvert particuliers (mensuelle)', description: '0,05% du plus fort decouvert du mois + TAF, minimum 500 F CFA + TAF.', type: RT.FEE, field: 'commission_plus_fort_decouvert', percentage: 0.05, minAmount: 500, period: RP.MONTHLY, priority: 2 },
      { code: 'CC_FACILITE_CAISSE', label: 'Facilites de caisse (credit court terme non formalise)', description: '0,5% + TAF. Commission appliquee sur les facilites de caisse ponctuelles accordees.', type: RT.FEE, field: 'commission_facilite_caisse', percentage: 0.5, priority: 2 },
      { code: 'CC_AUTRES_CT', label: 'Autres credits a court terme - commission', description: '1,5% + TAF sur le montant du credit accorde.', type: RT.FEE, field: 'commission_autres_credits_ct', percentage: 1.5, priority: 2 },
      { code: 'CC_DROIT_TIMBRE', label: 'Droit de timbre par feuille de convention de credit', description: '1 500 F CFA par feuille de convention (timbre fiscal non soumis a TAF, reverse au Tresor).', type: RT.FEE, field: 'droit_timbre_convention_credit', flatAmount: 1_500, priority: 3 },
    ],
  );

  // 7. CREDIT_HABITAT_PART
  await upsertProduct(
    'CREDIT_HABITAT_PART',
    "Credit a l'Habitat - Particuliers",
    "Prets immobiliers, taux d'interet et frais connexes (A-VII 7.2)",
    'LOAN',
    'A-VII-7.2',
    [
      { code: 'CH_MOYEN_TERME_TAUX', label: 'Taux credit habitat moyen terme', description: "7,75% l'an + TAF. Credit immobilier dune duree comprise entre 1 et 7 ans.", type: RT.INTEREST, field: 'taux_habitat_moyen_terme', percentage: 7.75, period: RP.YEARLY, priority: 1 },
      { code: 'CH_LONG_TERME_TAUX', label: 'Taux credit habitat long terme', description: "7,75% l'an + TAF. Credit immobilier dune duree superieure a 7 ans.", type: RT.INTEREST, field: 'taux_habitat_long_terme', percentage: 7.75, period: RP.YEARLY, priority: 1 },
      { code: 'CH_PRET_PARTICULIER_TAUX', label: 'Taux pret immobilier standard aux particuliers', description: "8,5% l'an + TAF. Taux standard pour pret immobilier particulier.", type: RT.INTEREST, field: 'taux_pret_immobilier_particulier', percentage: 8.5, period: RP.YEARLY, priority: 1 },
      { code: 'CH_ETUDE_DOSSIER', label: "Frais d'etude de dossier de credit habitat", description: '1,5% Flat du montant + TAF, pour tout dossier dont le montant est superieur a 1 500 000 F CFA.', type: RT.FEE, field: 'frais_etude_dossier_habitat', percentage: 1.5, minAmount: 1_500_000, priority: 1 },
      { code: 'CH_TAUX_INF_5ANS', label: "Taux d'interet - duree inferieure ou egale a 5 ans", description: "8% l'an + TAF.", type: RT.INTEREST, field: 'taux_habitat_inf_5ans', percentage: 8, period: RP.YEARLY, priority: 1 },
      { code: 'CH_TAUX_5_6ANS', label: "Taux d'interet - duree de 5 a 6 ans", description: "8,5% l'an + TAF.", type: RT.INTEREST, field: 'taux_habitat_5_6ans', percentage: 8.5, period: RP.YEARLY, priority: 1 },
      { code: 'CH_TAUX_7_8ANS', label: "Taux d'interet - duree de 7 a 8 ans", description: "9% l'an + TAF.", type: RT.INTEREST, field: 'taux_habitat_7_8ans', percentage: 9, period: RP.YEARLY, priority: 1 },
      { code: 'CH_TAUX_20ANS', label: "Taux d'interet - duree maximum 20 ans", description: '6% HT + TAF. Taux preferentiel pour les pret sur 20 ans, limite a 15 000 000 F CFA.', type: RT.INTEREST, field: 'taux_habitat_20ans', percentage: 6, period: RP.YEARLY, priority: 1 },
      { code: 'CH_MONTANT_MAX_20ANS', label: 'Montant maximum - credit sur 20 ans', description: '15 000 000 F CFA maximum pour le credit habitat a taux de 6% sur 20 ans.', type: RT.LIMIT, field: 'montant_max_credit_20ans', operator: RO.LTE, value: 15_000_000, priority: 1 },
      { code: 'CH_DUREE_MAX', label: 'Duree maximale du credit habitat', description: "20 ans maximum. La duree est definie selon la capacite de remboursement et lage du client.", type: RT.LIMIT, field: 'duree_max_credit_habitat_ans', operator: RO.LTE, value: 20, priority: 1 },
      { code: 'CH_PENALITE_ANTICIP', label: 'Penalite sur remboursement anticipe', description: '1,5% + TAF du capital restant du. Applique en cas de remboursement avant terme.', type: RT.FEE, field: 'penalite_remboursement_anticipe', percentage: 1.5, priority: 2 },
      { code: 'CH_RACHAT_INTERNE', label: 'Commission de rachat interne de credit', description: "1,5% + TAF du montant rachete. Rachat d'un credit existant chez Orabank.", type: RT.FEE, field: 'commission_rachat_interne', percentage: 1.5, priority: 2 },
      { code: 'CH_RACHAT_EXTERNE', label: 'Commission de rachat externe de credit', description: "3% + TAF du capital repris, minimum 300 000 F CFA. Rachat d'un credit accorde par une autre banque.", type: RT.FEE, field: 'commission_rachat_externe', percentage: 3, minAmount: 300_000, priority: 2 },
      { code: 'CH_RESTRUCTURATION', label: 'Commission de restructuration', description: '1% + TAF du montant restructure, minimum 25 000 F CFA. Reamenagement des conditions du pret.', type: RT.FEE, field: 'commission_restructuration', percentage: 1, minAmount: 25_000, priority: 2 },
      { code: 'CH_DROIT_TIMBRE', label: 'Droit de timbre par feuille de convention', description: '1 500 F CFA par feuille (timbre fiscal, non soumis a TAF).', type: RT.FEE, field: 'droit_timbre_convention_habitat', flatAmount: 1_500, priority: 3 },
      { code: 'CH_MAINLEVEE_HYPO', label: "Mainlevee d'hypothecque partielle ou totale", description: "10 000 F CFA + TAF. Hors frais notaries et denregistrement (recuperes au reel).", type: RT.FEE, field: 'mainlevee_hypotheque', flatAmount: 10_000, priority: 2 },
      { code: 'CH_MAINLEVEE_PROMESSE', label: "Frais de mainlevee de promesse d'hypothecque", description: '10 000 F CFA + TAF. Hors frais notaries.', type: RT.FEE, field: 'mainlevee_promesse_hypotheque', flatAmount: 10_000, priority: 2 },
      { code: 'CH_FRAIS_IMPAYE', label: "Frais d'impaye au remboursement", description: "3% + TAF du montant de lecheance impayee. Preleve a chaque incident de remboursement.", type: RT.FEE, field: 'frais_impaye_remboursement', percentage: 3, priority: 2 },
      { code: 'CH_ETAT_ENGAGEMENT', label: "Frais d'etat d'engagement", description: "50 000 F CFA + TAF. Document certifiant letat des engagements du client vis-a-vis de la banque.", type: RT.FEE, field: 'frais_etat_engagement', flatAmount: 50_000, priority: 3 },
      { code: 'CH_FRAIS_ANTICIPATION', label: "Frais d'anticipation", description: '2% + TAF du capital anticipe. Frais en sus de la penalite de remboursement anticipe.', type: RT.FEE, field: 'frais_anticipation_credit', percentage: 2, priority: 2 },
      { code: 'CH_ECHEANCE_IMPAYEE', label: "Frais d'echeance impayee", description: "2% + TAF du montant de lecheance impayee (selon periodicite : mensuelle, trimestrielle, etc.).", type: RT.FEE, field: 'frais_echeance_impayee_habitat', percentage: 2, priority: 2 },
    ],
  );

  // 8. INTERNATIONAL_PART
  // Fusion de CHANGE_PART + ETRANGER_PART
  await upsertProduct(
    'INTERNATIONAL_PART',
    "Operations Internationales - Particuliers",
    'Change, cheques etrangers, transferts SWIFT, virements internationaux particuliers (A-VI + A-VIII)',
    'INTERNATIONAL',
    'A-VI-A-VIII',
    [
      // -- CHANGE_PART --
      { code: 'CHANGE_BILLETS_COM', label: 'Achat/vente de billets de banque etrangers - commission de manipulation', description: "2% du montant echange. Applicable a lachat et a la vente de devises fiduciaires (billets). Taux de change selon cours du jour.", type: RT.FEE, field: 'commission_change_billets', percentage: 2, priority: 1 },
      // -- ETRANGER_PART --
      { code: 'ETR_ENCAISSEMENT_PCT', label: "Frais d'encaissement de cheque payable a l'etranger", description: '0,25% du montant + TAF.', type: RT.FEE, field: 'encaissement_cheque_etranger', percentage: 0.25, priority: 1 },
      { code: 'ETR_MANIPULATION', label: 'Frais de manipulation (cheque etranger)', description: '1 100 F CFA TTC par cheque. Frais fixes de traitement operationnel.', type: RT.FEE, field: 'frais_manipulation_cheque_etranger', flatAmount: 1_100, priority: 2 },
      { code: 'ETR_PORT_LETTRE', label: 'Frais de port de lettre', description: "2 000 F CFA par envoi postal (+ tarif courrier en vigueur).", type: RT.FEE, field: 'frais_port_lettre_etranger', flatAmount: 2_000, priority: 3 },
      { code: 'ETR_COM_CHANGE', label: 'Commission de change - cheque libelle en devises', description: "0,25% du montant + TAF. Appliquee lors de la conversion de devises etrangeres en F CFA.", type: RT.FEE, field: 'commission_change_cheque_etranger', percentage: 0.25, priority: 2 },
      { code: 'ETR_IMPAYE', label: "Frais d'impaye sur cheque etranger", description: '7 000 F CFA + TAF par cheque retourne impaye.', type: RT.FEE, field: 'frais_impaye_cheque_etranger', flatAmount: 7_000, priority: 1 },
      { code: 'ETR_FRAIS_DOSSIER_EMISSION', label: "Frais de dossier - emission de cheque de banque a destination d'un pays etranger", description: "10 000 F CFA + TAF par dossier demission.", type: RT.FEE, field: 'frais_dossier_emission_cheque_banque', flatAmount: 10_000, priority: 1 },
      { code: 'ETR_TRANSFERT_UEMOA', label: 'Transfert zone UEMOA', description: "15 000 F CFA + TAF. Virement vers un pays membre de lUEMOA via STAR-UEMOA.", type: RT.FEE, field: 'transfert_zone_uemoa', flatAmount: 15_000, priority: 1 },
      { code: 'ETR_SWIFT_AVEC_CHANGE', label: 'Virement SWIFT hors UEMOA - avec change (autres devises)', description: "0,2% du montant + TAF. Virement en devises vers letranger avec conversion depuis le F CFA.", type: RT.FEE, field: 'virement_swift_avec_change', percentage: 0.2, priority: 1 },
      { code: 'ETR_SWIFT_SANS_CHANGE', label: 'Virement SWIFT hors UEMOA - sans change', description: '0,3% + TAF. En sus : 7,75% + TAF (frais de correspondant et taux de refinancement). Pour virements en F CFA vers compte hors UEMOA.', type: RT.FEE, field: 'virement_swift_sans_change', percentage: 0.3, priority: 1 },
      { code: 'ETR_APPEL_FONDS', label: 'Appel de fonds emis', description: "5 000 F CFA + TAF. Service de mise a disposition de fonds a letranger (ex: virement recu en attente).", type: RT.FEE, field: 'appel_fonds_emis', flatAmount: 5_000, priority: 2 },
    ],
  );

  // =========================================================================
  // SECTION B - ENTREPRISES ET ONG
  // =========================================================================

  // 9. COMPTE_ENT
  // Fusion de COMPTES_ENT + GESTION_COMPTE_ENT
  await upsertProduct(
    'COMPTE_ENT',
    'Comptes - Entreprises et ONG',
    'Ouverture, cloture, gestion de comptes et frais par type dentite (B-I + B-II 2.1)',
    'ACCOUNT',
    'B-I-B-II-2.1',
    [
      // -- COMPTES_ENT --
      { code: 'ENT_OUV_FRANCO', label: 'Ouverture de compte (avec convention)', description: 'Franco (gratuit) - ouverture de tout type de compte avec remise de la convention de compte.', type: RT.FEE, field: 'ouverture_compte_entreprise', flatAmount: 0, priority: 1 },
      { code: 'ENT_INSTRUMENTS_FIN', label: "Compte d'instruments financiers (SA / SARL / ETS)", description: "50 000 F CFA pour SA, SARL ou ETS. Compte dedie a la gestion dinstruments financiers.", type: RT.FEE, field: 'compte_instruments_financiers', flatAmount: 50_000, priority: 1 },
      { code: 'ENT_COMPTE_COURANT', label: 'Ouverture compte courant entreprise', description: "50 000 F CFA de depot initial obligatoire a louverture.", type: RT.FEE, field: 'ouverture_compte_courant_ent', flatAmount: 50_000, priority: 1 },
      { code: 'ENT_DEPOT_INITIAL', label: "Depot initial minimum a louverture", description: "50 000 F CFA minimum requis pour tout ouverture de compte courant entreprise.", type: RT.ELIGIBILITY, field: 'depot_initial_entreprise', operator: RO.GTE, value: 50_000, weight: 100, priority: 1 },
      { code: 'ENT_DAT_GDE_ENT', label: 'DAT Grande Entreprise / Institution - depot minimum', description: "10 000 000 F CFA minimum. Taux selon grille DAT en vigueur.", type: RT.ELIGIBILITY, field: 'dat_grande_entreprise_min', operator: RO.GTE, value: 10_000_000, weight: 100, priority: 1 },
      { code: 'ENT_DAT_ONG', label: 'DAT ONG / Associations - depot minimum', description: "5 000 000 F CFA minimum. Taux selon grille DAT en vigueur.", type: RT.ELIGIBILITY, field: 'dat_ong_association_min', operator: RO.GTE, value: 5_000_000, weight: 100, priority: 1 },
      { code: 'ENT_CLO_DAT', label: 'Cloture DAT societe / ONG', description: 'Franco (gratuit).', type: RT.FEE, field: 'cloture_dat_entreprise', flatAmount: 0, priority: 1 },
      { code: 'ENT_CLO_COURANT', label: 'Cloture compte courant societe / entreprise individuelle', description: 'Franco (gratuit).', type: RT.FEE, field: 'cloture_compte_courant_ent', flatAmount: 0, priority: 1 },
      // -- GESTION_COMPTE_ENT --
      { code: 'GE_TAUX_DEBITEUR_MTD', label: 'Meilleur taux debiteur (MTD)', description: "8% l'an + TAF. Taux debiteur de reference pour les entreprises.", type: RT.INTEREST, field: 'taux_debiteur_entreprise', percentage: 8, period: RP.YEARLY, priority: 1 },
      { code: 'GE_PLUS_FORT_DECOUVERT', label: 'Commission de plus fort decouvert (mensuelle)', description: '0,10%/mois + TAF, minimum 50 000 F CFA + TAF. Prelevee mensuellement sur le plus fort debit du mois.', type: RT.FEE, field: 'commission_plus_fort_decouvert_ent', percentage: 0.1, minAmount: 50_000, period: RP.MONTHLY, priority: 2 },
      { code: 'GE_COM_MVT_DEBIT', label: 'Commission mouvement debit - compte courant', description: 'Franco (gratuit) - aucune commission sur les mouvements au debit du compte courant.', type: RT.FEE, field: 'commission_mvt_debit_courant_ent', flatAmount: 0, priority: 2 },
      { code: 'GE_DEPASSEMENT_AUTORISE', label: 'Commission depassement - compte autorise', description: '0,5% Flat + TAF du montant du depassement.', type: RT.FEE, field: 'commission_depassement_autorise_ent', percentage: 0.5, priority: 2 },
      { code: 'GE_DEPASSEMENT_NON_AUTH', label: 'Commission depassement - compte non autorise', description: '0,5% Flat + TAF du montant en depassement.', type: RT.FEE, field: 'commission_depassement_non_autorise_ent', percentage: 0.5, priority: 2 },
      // -- Tenue de compte par type d entite --
      { code: 'GE_TENUE_SARL_SA', label: 'Frais de tenue de compte - SARL / SA (mensuel)', description: '5 000 F CFA + TAF par mois pour les societes commerciales (SARL et SA).', type: RT.FEE, field: 'tenue_compte_sarl_sa', flatAmount: 5_000, period: RP.MONTHLY, priority: 1 },
      { code: 'GE_TENUE_ETS', label: 'Frais de tenue de compte - Etablissements / Institutionnels (mensuel)', description: '3 000 F CFA + TAF par mois.', type: RT.FEE, field: 'tenue_compte_ets_institutionnels', flatAmount: 3_000, period: RP.MONTHLY, priority: 1 },
      { code: 'GE_TENUE_TPE', label: 'Frais de tenue de compte - Tres Petites Entreprises (mensuel)', description: '2 000 F CFA + TAF par mois.', type: RT.FEE, field: 'tenue_compte_tres_petites_entreprises', flatAmount: 2_000, period: RP.MONTHLY, priority: 1 },
      { code: 'GE_TENUE_PE', label: 'Frais de tenue de compte - Petites Entreprises (mensuel)', description: '3 000 F CFA + TAF par mois.', type: RT.FEE, field: 'tenue_compte_petites_entreprises', flatAmount: 3_000, period: RP.MONTHLY, priority: 1 },
      { code: 'GE_TENUE_ONG_ASSOC', label: 'Frais de tenue de compte - Ambassades / ONG / Associations (mensuel)', description: '1 000 F CFA + TAF par mois. Inclut : ambassades, representations diplomatiques, ONG locales et internationales, petites associations, groupements, ecoles et confessions religieuses.', type: RT.FEE, field: 'tenue_compte_ong_associations', flatAmount: 1_000, period: RP.MONTHLY, priority: 1 },
      // -- Releves et attestations --
      { code: 'GE_RELEVE_DEMANDE', label: 'Releve de compte a la demande (mois en cours)', description: '5 000 F CFA par releve demande hors releve mensuel automatique.', type: RT.FEE, field: 'releve_demande_ent', flatAmount: 5_000, priority: 2 },
      { code: 'GE_RELEVE_AUTRE_PERIODE', label: 'Releve autre periode (tarif par annee)', description: "6 000 F CFA x nombre dannées + TAF. Ex: 3 ans = 18 000 + TAF.", type: RT.FEE, field: 'releve_autre_periode_ent', flatAmount: 6_000, priority: 2 },
      { code: 'GE_ATTEST_SOLDE', label: 'Attestation de solde', description: '30 000 F CFA.', type: RT.FEE, field: 'attestation_solde_ent', flatAmount: 30_000, priority: 2 },
      { code: 'GE_ATTEST_NON_ENGAGEMENT', label: 'Attestation de non-engagement', description: '60 000 F CFA.', type: RT.FEE, field: 'attestation_non_engagement_ent', flatAmount: 60_000, priority: 2 },
      { code: 'GE_ATTEST_DEDUCTIBILITE', label: 'Attestation de deductibilite fiscale', description: '25 000 F CFA + TAF.', type: RT.FEE, field: 'attestation_deductibilite_ent', flatAmount: 25_000, priority: 2 },
      { code: 'GE_ATTEST_COMPTE', label: 'Attestation de compte', description: '25 000 F CFA + TAF.', type: RT.FEE, field: 'attestation_compte_ent', flatAmount: 25_000, priority: 2 },
      { code: 'GE_ATTEST_CAUTION', label: 'Attestation de caution solidaire', description: '25 000 F CFA + TAF.', type: RT.FEE, field: 'attestation_caution_solidaire_ent', flatAmount: 25_000, priority: 2 },
      { code: 'GE_TIMBRE_VERSEMENT', label: "Frais de timbre fiscal pour versement d'especes", description: '100 F CFA par operation de versement (timbre fiscal reverse au Tresor).', type: RT.FEE, field: 'frais_timbre_versement_ent', flatAmount: 100, priority: 3 },
    ],
  );

  // 10. CARTE_VISA_BUSINESS
  await upsertProduct(
    'CARTE_VISA_BUSINESS',
    'Carte Visa Business',
    'Carte Visa Business - carte entreprise avec plafonds eleves (B-II 2.2.2.1.2.1)',
    'CARD',
    'B-II-2.2.2.1.2.1',
    [
      { code: 'VB_ABONNEMENT', label: "Frais d'abonnement et de gestion mensuel", description: '7 500 F CFA par mois par carte.', type: RT.FEE, field: 'frais_abonnement_mensuel', flatAmount: 7_500, period: RP.MONTHLY, priority: 1 },
      { code: 'VB_RETRAIT_GAB_MAX_JOUR', label: 'Montant maximum retrait GAB par jour', description: '2 000 000 F CFA par jour.', type: RT.LIMIT, field: 'retrait_gab_max_jour', operator: RO.LTE, value: 2_000_000, priority: 1 },
      { code: 'VB_PAIEMENT_TPE_MIN_JOUR', label: 'Montant minimum paiement TPE par jour', description: '2 500 000 F CFA minimum par jour en paiement commercant (plafond plancher Business).', type: RT.LIMIT, field: 'paiement_tpe_min_jour', operator: RO.GTE, value: 2_500_000, priority: 1 },
      { code: 'VB_NB_TX_JOUR', label: 'Nombre maximum de transactions journalieres', description: '10 transactions par jour.', type: RT.LIMIT, field: 'nb_transactions_jour', operator: RO.LTE, value: 10, priority: 1 },
      { code: 'VB_VALIDITE_ANS', label: 'Duree de validite de la carte', description: '3 ans.', type: RT.LIMIT, field: 'validite_annees', value: 3, priority: 1 },
      { code: 'VB_RETRAIT_DAB_ORABANK', label: 'Retrait au DAB Orabank', description: 'Franco (gratuit).', type: RT.FEE, field: 'retrait_dab_orabank', flatAmount: 0, priority: 1 },
      { code: 'VB_RETRAIT_DAB_GIM', label: 'Retrait au DAB GIM-UEMOA', description: '500 F CFA par retrait.', type: RT.FEE, field: 'retrait_dab_gim_uemoa', flatAmount: 500, priority: 1 },
      { code: 'VB_RETRAIT_DAB_HORS_PAYS', label: 'Retrait au GAB hors pays', description: '2% + TAF du montant.', type: RT.FEE, field: 'retrait_dab_hors_pays', percentage: 2, priority: 1 },
      { code: 'VB_DAB_HORS_UEMOA', label: 'Retrait DAB hors zone UEMOA', description: '1,6% du montant (tarif specifique Business pour zone hors UEMOA - non soumis a TAF sur ce taux).', type: RT.FEE, field: 'retrait_dab_hors_uemoa', percentage: 1.6, priority: 1 },
      { code: 'VB_ANNULATION', label: 'Annulation de la carte', description: '10 000 F CFA.', type: RT.FEE, field: 'annulation_carte', flatAmount: 10_000, priority: 2 },
      { code: 'VB_REFECTION', label: 'Refexion de la carte', description: '12 000 F CFA.', type: RT.FEE, field: 'refection_carte', flatAmount: 12_000, priority: 2 },
      { code: 'VB_REEDITION_CODE', label: 'Reedition du code PIN', description: '2 000 F CFA + TAF.', type: RT.FEE, field: 'reedition_code_pin', flatAmount: 2_000, priority: 3 },
      { code: 'VB_OPPOSITION', label: 'Opposition sur carte entreprise', description: "45 000 F CFA. Tarif entreprise significativement superieur au tarif particulier (usage professionnel et responsabilite de l'entreprise).", type: RT.FEE, field: 'opposition_carte_entreprise', flatAmount: 45_000, priority: 1 },
    ],
  );

  // 11. CREDIT_ENT
  // Fusion de CREDIT_TRESORERIE_ENT + CREDIT_SIGNATURE_ENT
  await upsertProduct(
    'CREDIT_ENT',
    'Credits - Entreprises',
    'Credits de tresorerie, effets de commerce et credits par signature entreprises (B-VIII 8.1 + 8.2)',
    'LOAN',
    'B-VIII-8.1-8.2',
    [
      // -- CREDIT_TRESORERIE_ENT : Court terme --
      { code: 'CT_COM_DOSSIER_CT', label: 'Commission de dossier - credits court terme', description: '1,5% max + TAF du montant, minimum 50 000 F CFA + TAF. Prelevee a la mise en place.', type: RT.FEE, field: 'commission_dossier_court_terme', percentage: 1.5, minAmount: 50_000, priority: 1 },
      { code: 'CT_DECOUVERT_MARGE', label: 'Decouvert en compte - taux (TBB + marge)', description: 'TBB + 3,5% + TAF. Le taux effectif = Taux de Base Bancaire en vigueur + 3,5 points. TBB fixe par la BCEAO (variable).', type: RT.INTEREST, field: 'marge_decouverte_entreprise', percentage: 3.5, period: RP.YEARLY, priority: 1 },
      { code: 'CT_AUTRES_CT_MARGE', label: 'Autres credits court terme - taux (TBB + marge)', description: 'TBB + 4% maximum + TAF. Applique aux credits de campagne, credits de stocks, credits spot.', type: RT.INTEREST, field: 'marge_autres_credits_ct', percentage: 4, period: RP.YEARLY, priority: 1 },
      // -- CREDIT_TRESORERIE_ENT : Moyen et long terme --
      { code: 'CT_COM_DOSSIER_MLT', label: 'Commission de dossier - credits moyen et long terme', description: '1,5% max + TAF du montant, minimum 50 000 F CFA + TAF.', type: RT.FEE, field: 'commission_dossier_moyen_long_terme', percentage: 1.5, minAmount: 50_000, priority: 1 },
      { code: 'CT_MOYEN_TERME_MARGE', label: 'Credits moyen terme - taux (TBB + marge)', description: 'TBB + 4% + TAF. Pour investissements de 2 a 7 ans.', type: RT.INTEREST, field: 'marge_credit_moyen_terme', percentage: 4, period: RP.YEARLY, priority: 1 },
      { code: 'CT_LONG_TERME_MARGE', label: 'Credits long terme - taux (TBB + marge)', description: 'TBB + 4% + TAF. Pour investissements de plus de 7 ans.', type: RT.INTEREST, field: 'marge_credit_long_terme', percentage: 4, period: RP.YEARLY, priority: 1 },
      // -- CREDIT_TRESORERIE_ENT : Autres financements --
      { code: 'CT_ESCOMPTE_MARGE', label: "Escompte d'effets de commerce - taux (TBB + marge)", description: "TBB + 1,5% + TAF. Mobilisation de creances commerciales via lescompte d'effets.", type: RT.INTEREST, field: 'marge_escompte_effets', percentage: 1.5, period: RP.YEARLY, priority: 1 },
      { code: 'CT_FACILITE_CAISSE_MARGE', label: 'Facilites de caisse et avances - taux (TBB + marge)', description: 'TBB + 3,5% + TAF. Pour besoins de tresorerie ponctuels.', type: RT.INTEREST, field: 'marge_facilite_caisse_entreprise', percentage: 3.5, period: RP.YEARLY, priority: 1 },
      { code: 'CT_CONSOLIDATION_MARGE', label: 'Pret de consolidation de decouvert - taux (TBB + marge)', description: "TBB + 3,5% + TAF. Consolidation d'un decouvert persistant en pret amortissable.", type: RT.INTEREST, field: 'marge_consolidation_decouvert', percentage: 3.5, period: RP.YEARLY, priority: 1 },
      // -- CREDIT_TRESORERIE_ENT : Frais connexes --
      { code: 'CT_MAINLEVEE_HYPO', label: "Mainlevee d'hypothecque partielle ou totale", description: '10 000 F CFA + TAF. Hors frais notaries et denregistrement.', type: RT.FEE, field: 'mainlevee_hypotheque_ent', flatAmount: 10_000, priority: 2 },
      { code: 'CT_MODIF_SIMPLE', label: "Modification simple du credit (echeance, compte, periodicite)", description: '5 000 F CFA + TAF.', type: RT.FEE, field: 'modification_simple_credit_ent', flatAmount: 5_000, priority: 3 },
      { code: 'CT_MODIF_TAUX_TABLEAU', label: "Modification de taux avec reedition du tableau damortissement", description: '5 000 F CFA + TAF.', type: RT.FEE, field: 'modification_taux_tableau_amort', flatAmount: 5_000, priority: 3 },
      { code: 'CT_ECHEANCE_IMPAYEE', label: "Frais d'echeance impayee", description: "3% + TAF du montant de lecheance impayee.", type: RT.FEE, field: 'frais_echeance_impayee_ent', percentage: 3, priority: 2 },
      { code: 'CT_ETUDE_DOSSIER', label: "Frais d'etude de dossier de pret", description: '1,5% + TAF du montant demande.', type: RT.FEE, field: 'frais_etude_dossier_pret_ent', percentage: 1.5, priority: 1 },
      { code: 'CT_ESCOMPTE_COM_MIN', label: "Frais et commissions d'escompte - minimum", description: "100 000 F CFA + TAF minimum par dossier d'escompte.", type: RT.FEE, field: 'commission_escompte_minimum', flatAmount: 100_000, priority: 2 },
      // -- CREDIT_SIGNATURE_ENT --
      { code: 'CS_CAUTION_MARCHE', label: 'Caution sur marches bancaires', description: "3% du montant cautionne + TAF, minimum 50 000 F CFA + TAF. Caution en faveur d'un maitre douvrage pour garantir lexecution d'un marche.", type: RT.FEE, field: 'caution_marche_bancaire', percentage: 3, minAmount: 50_000, priority: 1 },
      { code: 'CS_SOUMISSION_INF_10M', label: 'Frais de dossier - caution de soumission < 10 000 000 F CFA', description: "25 000 F CFA + TAF. Caution permettant de participer a un appel doffres.", type: RT.FEE, field: 'frais_dossier_caution_soumission_inf10m', flatAmount: 25_000, priority: 1 },
      { code: 'CS_SOUMISSION_10_50M', label: 'Frais de dossier - caution de soumission entre 10M et 50M', description: '35 000 F CFA + TAF.', type: RT.FEE, field: 'frais_dossier_caution_soumission_10_50m', flatAmount: 35_000, priority: 1 },
      { code: 'CS_SOUMISSION_SUP_50M', label: 'Frais de dossier - caution de soumission > 50 000 000 F CFA', description: '50 000 F CFA + TAF.', type: RT.FEE, field: 'frais_dossier_caution_soumission_sup50m', flatAmount: 50_000, priority: 1 },
      { code: 'CS_AUTRES_CAUTIONS', label: 'Autres cautions (bonne execution, retenue de garantie, etc.)', description: '0,25% du montant + TAF, minimum 25 000 F CFA + TAF.', type: RT.FEE, field: 'autres_cautions_entreprise', percentage: 0.25, minAmount: 25_000, priority: 1 },
      { code: 'CS_AVENANT', label: 'Avenant sur caution', description: "15 000 F CFA + TAF. Modification d'une caution existante (montant, duree, beneficiaire).", type: RT.FEE, field: 'avenant_caution', flatAmount: 15_000, priority: 2 },
      { code: 'CS_MODIF_SIMPLE', label: "Modification simple d'une caution", description: "15 000 F CFA + TAF. Modification mineure (date d'echeance, numero de compte, periodicite).", type: RT.FEE, field: 'modification_simple_caution', flatAmount: 15_000, priority: 2 },
      { code: 'CS_CAUTIONS_FISCALES', label: 'Cautions fiscales et douanieres', description: "3% du montant + TAF, minimum 15 000 F CFA + TAF. Cautions accordees en faveur de l'administration fiscale ou des douanes.", type: RT.FEE, field: 'cautions_fiscales_douanieres', percentage: 3, minAmount: 15_000, priority: 1 },
      { code: 'CS_AVAL_TRAITES', label: 'Aval de traites', description: "3% du montant + TAF, minimum 15 000 F CFA + TAF. Garantie de paiement accordee par la banque sur un effet de commerce.", type: RT.FEE, field: 'aval_traites_entreprise', percentage: 3, minAmount: 15_000, priority: 1 },
      // -- Attestations caution de soumission --
      { code: 'CS_ATT_SANS_MONTANT', label: 'Attestation caution de soumission - sans montant', description: '27 500 F CFA + TAF.', type: RT.FEE, field: 'attestation_caution_soumission_sans_montant', flatAmount: 27_500, priority: 2 },
      { code: 'CS_ATT_INF_10M', label: 'Attestation caution de soumission < 10M', description: '33 000 F CFA + TAF.', type: RT.FEE, field: 'attestation_caution_soumission_inf10m', flatAmount: 33_000, priority: 2 },
      { code: 'CS_ATT_10_50M', label: 'Attestation caution de soumission 10M-50M', description: '55 000 F CFA + TAF.', type: RT.FEE, field: 'attestation_caution_soumission_10_50m', flatAmount: 55_000, priority: 2 },
      { code: 'CS_ATT_50_200M', label: 'Attestation caution de soumission 50M-200M', description: '110 000 F CFA + TAF.', type: RT.FEE, field: 'attestation_caution_soumission_50_200m', flatAmount: 110_000, priority: 2 },
      { code: 'CS_ATT_SUP_200M', label: 'Attestation caution de soumission > 200M', description: '275 000 F CFA + TAF.', type: RT.FEE, field: 'attestation_caution_soumission_sup200m', flatAmount: 275_000, priority: 2 },
      // -- Frais de dossier par appel doffre --
      { code: 'CS_DOSSIER_INF_10M', label: 'Frais de dossier caution soumission - par AO < 10M', description: "27 500 F CFA + TAF par dossier d'appel doffre.", type: RT.FEE, field: 'dossier_caution_soumission_par_ao_inf10m', flatAmount: 27_500, priority: 2 },
      { code: 'CS_DOSSIER_10_50M', label: 'Frais de dossier caution soumission - par AO 10M-50M', description: '38 500 F CFA + TAF par dossier.', type: RT.FEE, field: 'dossier_caution_soumission_par_ao_10_50m', flatAmount: 38_500, priority: 2 },
      { code: 'CS_DOSSIER_SUP_50M', label: 'Frais de dossier caution soumission - par AO > 50M', description: '55 000 F CFA + TAF par dossier.', type: RT.FEE, field: 'dossier_caution_soumission_par_ao_sup50m', flatAmount: 55_000, priority: 2 },
      { code: 'CS_MAINLEVEE_HYPO', label: "Mainlevee d'hypothecque (credits par signature)", description: '11 000 F CFA + TAF. Hors frais notaries.', type: RT.FEE, field: 'mainlevee_hypo_credit_signature', flatAmount: 11_000, priority: 2 },
    ],
  );

  // 12. INTERNATIONAL_ENT
  // Identique a ETRANGER_ENT original
  await upsertProduct(
    'INTERNATIONAL_ENT',
    "Operations Internationales - Entreprises",
    'Encaissements devises, emissions, transferts SWIFT et operations documentaires entreprises (B-IX)',
    'INTERNATIONAL',
    'B-IX',
    [
      // -- Encaissement cheques/effets Euro --
      { code: 'EE_EUR_COM_PROROGATION', label: 'Commission de prorogation / rapatriement - Euro', description: "25 000 F CFA + TAF. Report de delai de rapatriement de devises.", type: RT.FEE, field: 'commission_prorogation_rapatriement_eur', flatAmount: 25_000, priority: 2 },
      { code: 'EE_EUR_COM_ENCAISSEMENT', label: "Commission d'encaissement - Euro", description: '15 000 F CFA + TAF par cheque ou effet en Euro encaisse.', type: RT.FEE, field: 'commission_encaissement_eur', flatAmount: 15_000, priority: 1 },
      { code: 'EE_EUR_FRAIS_ENVOI', label: "Frais d'envoi - Euro", description: '2 000 F CFA + TAF + tarif courrier.', type: RT.FEE, field: 'frais_envoi_eur', flatAmount: 2_000, priority: 2 },
      { code: 'EE_EUR_IMPAYE', label: 'Provision pour retour de cheque impaye - Euro', description: '15 000 F CFA + TAF par cheque retourne impaye.', type: RT.FEE, field: 'provision_impaye_eur', flatAmount: 15_000, priority: 1 },
      { code: 'EE_EUR_SWIFT', label: 'Avis de sort / SWIFT - Euro', description: '15 000 F CFA + TAF par message SWIFT.', type: RT.FEE, field: 'swift_eur', flatAmount: 15_000, priority: 2 },
      // -- Autres devises --
      { code: 'EE_DEV_COM_CHANGE', label: 'Commission de change - autres devises', description: '0,3% du montant + TAF.', type: RT.FEE, field: 'commission_change_autres_devises', percentage: 0.3, priority: 1 },
      { code: 'EE_DEV_COM_ENCAISSEMENT', label: "Commission d'encaissement - autres devises", description: '0,35% du montant + TAF, minimum 10 000 F CFA + TAF.', type: RT.FEE, field: 'commission_encaissement_autres_devises', percentage: 0.35, minAmount: 10_000, priority: 1 },
      { code: 'EE_DEV_SWIFT', label: 'Frais SWIFT - autres devises', description: '25 000 F CFA + TAF par message SWIFT.', type: RT.FEE, field: 'swift_autres_devises', flatAmount: 25_000, priority: 2 },
      // -- Emission cheques en devises --
      { code: 'EE_EMIS_DOSSIER', label: "Frais de dossier - emission de cheque en devises", description: "10 000 F CFA + TAF par dossier d'emission.", type: RT.FEE, field: 'frais_dossier_emission_devises', flatAmount: 10_000, priority: 1 },
      { code: 'EE_EMIS_COM_TRANSFERT', label: 'Commission de transfert - emission de cheque en devises', description: '0,3% du montant + TAF.', type: RT.FEE, field: 'commission_transfert_emission_devises', percentage: 0.3, priority: 1 },
      { code: 'EE_EMIS_TAXE', label: 'Taxe sur emission - cheque en devises', description: "0,6% du montant. Taxe reglementaire sur les transferts hors UEMOA.", type: RT.FEE, field: 'taxe_emission_devises', percentage: 0.6, priority: 1 },
      { code: 'EE_EMIS_SWIFT', label: 'Frais SWIFT - emission de cheque en devises', description: '25 000 F CFA + TAF.', type: RT.FEE, field: 'swift_emission_devises', flatAmount: 25_000, priority: 2 },
      // -- Transferts --
      { code: 'EE_TRANSFERT_UEMOA', label: 'Transfert zone UEMOA', description: '15 000 F CFA + TAF.', type: RT.FEE, field: 'transfert_uemoa_ent', flatAmount: 15_000, priority: 1 },
      { code: 'EE_HORS_UEMOA_TAXE', label: 'Transfert hors UEMOA - taxe reglementaire', description: "0,6% du montant. Taxe legale sur tout transfert hors zone UEMOA.", type: RT.FEE, field: 'taxe_transfert_hors_uemoa', percentage: 0.6, priority: 1 },
      { code: 'EE_HORS_UEMOA_COM', label: 'Transfert hors UEMOA - commission', description: '0,3% du montant + TAF.', type: RT.FEE, field: 'commission_transfert_hors_uemoa', percentage: 0.3, priority: 1 },
      { code: 'EE_HORS_UEMOA_SWIFT', label: 'Transfert hors UEMOA - frais SWIFT', description: '15 000 F CFA + TAF.', type: RT.FEE, field: 'swift_transfert_hors_uemoa', flatAmount: 15_000, priority: 2 },
      { code: 'EE_HORS_UEMOA_DOSSIER', label: 'Transfert hors UEMOA - frais de dossier', description: '10 000 F CFA + TAF.', type: RT.FEE, field: 'frais_dossier_transfert_hors_uemoa', flatAmount: 10_000, priority: 1 },
      { code: 'EE_AVEC_CHANGE_TAXE', label: 'Virement SWIFT avec change - taxe reglementaire', description: "0,6% du montant.", type: RT.FEE, field: 'taxe_virement_avec_change', percentage: 0.6, priority: 1 },
      { code: 'EE_AVEC_CHANGE_COM', label: 'Virement SWIFT avec change - commission', description: '0,2% du montant + TAF.', type: RT.FEE, field: 'commission_virement_avec_change', percentage: 0.2, priority: 1 },
      { code: 'EE_APPEL_FONDS', label: 'Appel de fonds emis', description: '5 000 F CFA + TAF.', type: RT.FEE, field: 'appel_fonds_emis_ent', flatAmount: 5_000, priority: 2 },
      { code: 'EE_WE_COLLECT', label: 'Service WE COLLECT emis', description: "5 000 F CFA + TAF. Service de collecte internationale de fonds via correspondants.", type: RT.FEE, field: 'service_we_collect', flatAmount: 5_000, priority: 2 },
      // -- Remise documentaire import --
      { code: 'RDI_DOSSIER', label: 'Remise documentaire import - frais de dossier', description: "10 000 F CFA + TAF par dossier de remise documentaire.", type: RT.FEE, field: 'rdi_frais_dossier', flatAmount: 10_000, priority: 1 },
      { code: 'RDI_ENCAISSEMENT', label: "Remise documentaire import - commission d'encaissement", description: "0,35% du montant + TAF, minimum 10 000 F CFA + TAF.", type: RT.FEE, field: 'rdi_commission_encaissement', percentage: 0.35, minAmount: 10_000, priority: 1 },
      { code: 'RDI_PROROGATION', label: 'Remise documentaire import - commission de prorogation', description: "25 000 F CFA + TAF par report d'echeance.", type: RT.FEE, field: 'rdi_commission_prorogation', flatAmount: 25_000, priority: 2 },
      { code: 'RDI_ACCEPTATION', label: "Remise documentaire import - commission d'acceptation", description: "20 000 F CFA + TAF. Acceptation d'une traite documentaire.", type: RT.FEE, field: 'rdi_commission_acceptation', flatAmount: 20_000, priority: 2 },
      { code: 'RDI_TAXE_TRANSFERT', label: 'Remise documentaire import - taxe transfert hors UEMOA', description: "0,6% du montant regle.", type: RT.FEE, field: 'rdi_taxe_transfert_hors_uemoa', percentage: 0.6, priority: 1 },
      { code: 'RDI_IMPAYE', label: "Remise documentaire import - impaye", description: "15 000 F CFA + TAF par retour d'impaye.", type: RT.FEE, field: 'rdi_frais_impaye', flatAmount: 15_000, priority: 1 },
      { code: 'RDI_SWIFT', label: 'Remise documentaire import - SWIFT', description: "25 000 F CFA + TAF par message.", type: RT.FEE, field: 'rdi_swift', flatAmount: 25_000, priority: 2 },
      // -- Credit documentaire import --
      { code: 'CDI_DOSSIER', label: 'Credit documentaire import - frais de dossier', description: "20 000 F CFA + TAF a louverture du credit documentaire.", type: RT.FEE, field: 'cdi_frais_dossier', flatAmount: 20_000, priority: 1 },
      { code: 'CDI_OUVERTURE', label: "Credit documentaire import - commission d'ouverture", description: "0,6% par trimestre civil indivis + TAF, minimum 25 000 F CFA. Prelevee a louverture et a chaque renouvellement trimestriel.", type: RT.FEE, field: 'cdi_commission_ouverture', percentage: 0.6, minAmount: 25_000, period: RP.MONTHLY, priority: 1 },
      { code: 'CDI_UTILISATION', label: "Credit documentaire import - commission d'utilisation", description: '0,5% du montant utilise + TAF.', type: RT.FEE, field: 'cdi_commission_utilisation', percentage: 0.5, priority: 1 },
      { code: 'CDI_ACCEPTATION', label: "Credit documentaire import - commission d'acceptation", description: "1% l'an + TAF, minimum 15 000 F CFA + TAF. Appliquee sur les credits documentaires a terme.", type: RT.FEE, field: 'cdi_commission_acceptation', percentage: 1, minAmount: 15_000, period: RP.YEARLY, priority: 2 },
      { code: 'CDI_TAXE_TRANSFERT', label: 'Credit documentaire import - taxe transfert hors UEMOA', description: "0,6% du montant regle a letranger.", type: RT.FEE, field: 'cdi_taxe_transfert_hors_uemoa', percentage: 0.6, priority: 1 },
      // -- Credit documentaire export --
      { code: 'CDE_NOTIFICATION', label: 'Credit documentaire export - commission de notification', description: '0,10% du montant + TAF, minimum 15 000 F CFA + TAF.', type: RT.FEE, field: 'cde_commission_notification', percentage: 0.1, minAmount: 15_000, priority: 1 },
      { code: 'CDE_CONFIRMATION', label: 'Credit documentaire export - commission de confirmation', description: '2% du montant + TAF, minimum 50 000 F CFA + TAF. Engagement de la banque de payer meme en cas de defaillance de la banque emettrice.', type: RT.FEE, field: 'cde_commission_confirmation', percentage: 2, minAmount: 50_000, priority: 1 },
      { code: 'CDE_NEGOCIATION', label: 'Credit documentaire export - commission de negociation', description: '0,20% du montant + TAF, minimum 15 000 F CFA + TAF.', type: RT.FEE, field: 'cde_commission_negociation', percentage: 0.2, minAmount: 15_000, priority: 1 },
      { code: 'CDE_ENCAISSEMENT', label: "Credit documentaire export - commission d'encaissement", description: '0,20% du montant + TAF, minimum 12 000 F CFA + TAF.', type: RT.FEE, field: 'cde_commission_encaissement', percentage: 0.2, minAmount: 12_000, priority: 1 },
      { code: 'CDE_RAPATRIEMENT', label: 'Credit documentaire export - commission de rapatriement', description: '0,125% du montant rapatrie + TAF, minimum 5 000 F CFA + TAF.', type: RT.FEE, field: 'cde_commission_rapatriement', percentage: 0.125, minAmount: 5_000, priority: 1 },
    ],
  );

  // Suppression des anciens produits hors schema v3
  const NEW_CODES = [
    'COMPTE_CHEQUE_PART', 'COMPTE_EPARGNE_PART', 'CARTE_VISA_PART',
    'CHEQUES_PART', 'VIREMENTS_PART', 'CREDIT_CONSO_PART', 'CREDIT_HABITAT_PART',
    'INTERNATIONAL_PART', 'COMPTE_ENT', 'CARTE_VISA_BUSINESS', 'CREDIT_ENT',
    'INTERNATIONAL_ENT',
  ];

  const { count: deletedRules } = await prisma.rule.deleteMany({
    where: { product: { code: { notIn: NEW_CODES } } },
  });
  const { count: deletedProducts } = await prisma.bankProduct.deleteMany({
    where: { code: { notIn: NEW_CODES } },
  });
  console.log(`Nettoyage : ${deletedProducts} produits et ${deletedRules} regles supprimes`);

  // Bilan
  console.log('\nSeed v3 termine avec succes !\n');

  const products = await prisma.bankProduct.findMany({
    include: { _count: { select: { rules: true } } },
    orderBy: { reference: 'asc' },
  });

  let totalRules = 0;
  for (const p of products) {
    console.log(
      '  [' + (p.reference || '').padEnd(25) + '] ' + p.code.padEnd(30) + ' -> ' + p._count.rules + ' regles',
    );
    totalRules += p._count.rules;
  }
  console.log(
    '\n  ' + products.length + ' produits  |  ' + totalRules + ' regles\n',
  );

  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error('Erreur fatale :', err);
  prisma.$disconnect();
  process.exit(1);
});
