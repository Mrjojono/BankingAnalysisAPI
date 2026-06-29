import { Injectable } from '@nestjs/common';
import { Recommendation, RecommendationMetrics } from '../types';
import { ANALYTICS_CONSTANTS } from '../config/constants';

@Injectable()
export class RecommendationEngine {
  generate(scores: RecommendationMetrics): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const hasIncome = scores.monthlyIncome > 0;

    // RÈGLE 0 — Aucun revenu détecté (Cas critique)
    if (!hasIncome) {
      recommendations.push({
        priority: 'HIGH',
        component: 'C1_expenses',
        trigger: 'Revenus non détectés',
        title: 'Aucun revenu détecté',
        message: `Aucun revenu n'a été détecté sur la période analysée. Sans revenus réguliers, votre santé financière est en danger immédiat.`,
        source: 'Financial Health Network — Pilier DÉPENSER',
      });

      // On ajoute quand même une recommandation d'épargne adaptée
      recommendations.push({
        priority: 'HIGH',
        component: 'C3_savings',
        trigger: `Taux épargne < 5%`,
        title: 'Épargne impossible',
        message: `Sans revenus, il est impossible de constituer une épargne. Priorisez la recherche d'une source de revenus stable.`,
        source: `Garman & Forgue — règle des ${ANALYTICS_CONSTANTS.GARMAN_FORGUE_SAVINGS_RATE_THRESHOLD}%`,
      });

      // Gestion des découverts si présents malgré l'absence de revenus
      if (scores.overdraftDays > 0) {
        recommendations.push({
          priority: 'HIGH',
          component: 'C4_stability',
          trigger: 'Découverts > 0 jours',
          title: 'Solde négatif critique',
          message: `Votre compte est à découvert alors qu'aucun revenu n'entre. Réduisez immédiatement toute dépense non vitale.`,
          source: 'CFPB Financial Well-Being Score',
        });
      }

      return recommendations;
    }

    // RÈGLE 1 — Épargne insuffisante
    // Source : Garman & Forgue — règle des 10%
    if (scores.savingsRate < 5) {
      const montantCible = Math.round(scores.monthlyIncome * 0.1);
      recommendations.push({
        priority: 'HIGH',
        component: 'C3_savings',
        trigger: 'Taux épargne < 5%',
        title: 'Épargne critique',
        message: `Vous épargnez moins de 5% de vos revenus. Commencez par mettre de côté ${montantCible.toLocaleString()} XOF dès réception de votre salaire — avant toute dépense.`,
        actionAmount: montantCible,
        source: `Garman & Forgue — règle des ${ANALYTICS_CONSTANTS.GARMAN_FORGUE_SAVINGS_RATE_THRESHOLD}%`,
      });
    } else if (
      scores.savingsRate <
      ANALYTICS_CONSTANTS.GARMAN_FORGUE_SAVINGS_RATE_THRESHOLD
    ) {
      const montantCible = Math.round(scores.monthlyIncome * 0.1);
      recommendations.push({
        priority: 'MEDIUM',
        component: 'C3_savings',
        trigger: `Taux épargne < ${ANALYTICS_CONSTANTS.GARMAN_FORGUE_SAVINGS_RATE_THRESHOLD}%`,
        title: 'Augmentez votre épargne',
        message: `Votre taux d'épargne est de ${scores.savingsRate}%. L'objectif recommandé est ${ANALYTICS_CONSTANTS.GARMAN_FORGUE_SAVINGS_RATE_THRESHOLD}%. Essayez d'ajouter ${montantCible.toLocaleString()} XOF par mois.`,
        actionAmount: montantCible,
        source: `Garman & Forgue — règle des ${ANALYTICS_CONSTANTS.GARMAN_FORGUE_SAVINGS_RATE_THRESHOLD}%`,
      });
    }

    // RÈGLE 2 — Endettement excessif
    // Source : BCEAO — seuil légal 33%
    if (scores.debtRatio > 40) {
      recommendations.push({
        priority: 'HIGH',
        component: 'C2_debt',
        trigger: 'Taux endettement > 40%',
        title: 'Endettement critique',
        message: `Vos remboursements représentent ${scores.debtRatio}% de vos revenus, bien au-dessus du seuil BCEAO de ${ANALYTICS_CONSTANTS.BCEAO_DEBT_RATIO_THRESHOLD}%. Envisagez un rachat de crédit ou une renégociation de vos mensualités.`,
        source: `BCEAO — ratio prudentiel ${ANALYTICS_CONSTANTS.BCEAO_DEBT_RATIO_THRESHOLD}%`,
      });
    } else if (
      scores.debtRatio > ANALYTICS_CONSTANTS.BCEAO_DEBT_RATIO_THRESHOLD
    ) {
      recommendations.push({
        priority: 'MEDIUM',
        component: 'C2_debt',
        trigger: `Taux endettement > ${ANALYTICS_CONSTANTS.BCEAO_DEBT_RATIO_THRESHOLD}%`,
        title: 'Endettement au-dessus du seuil',
        message: `Votre taux d'endettement de ${scores.debtRatio}% dépasse le seuil réglementaire BCEAO de ${ANALYTICS_CONSTANTS.BCEAO_DEBT_RATIO_THRESHOLD}%. Évitez tout nouveau crédit dans l'immédiat.`,
        source: `BCEAO — ratio prudentiel ${ANALYTICS_CONSTANTS.BCEAO_DEBT_RATIO_THRESHOLD}%`,
      });
    }

    // RÈGLE 3 — Découverts fréquents
    // Source : CFPB Financial Well-Being Score
    if (scores.overdraftDays >= 28) {
      recommendations.push({
        priority: 'HIGH',
        component: 'C4_stability',
        trigger: 'Découverts > 28 jours',
        title: 'Solde négatif permanent',
        message: `Votre compte est resté à découvert tout le mois. Vos dépenses dépassent systématiquement vos revenus. Une restructuration financière est nécessaire.`,
        source: 'CFPB Financial Well-Being Score',
      });
    } else if (scores.overdraftDays > 7) {
      const reserveCible = Math.round(scores.monthlyExpenses * 0.5);
      recommendations.push({
        priority: 'HIGH',
        component: 'C4_stability',
        trigger: 'Découverts > 7 jours',
        title: 'Découverts répétés',
        message: `Vous avez été à découvert ${scores.overdraftDays} jours ce mois. Constituez une réserve de ${reserveCible.toLocaleString()} XOF pour couvrir vos dépenses courantes.`,
        actionAmount: reserveCible,
        source: 'CFPB Financial Well-Being Score',
      });
    } else if (scores.overdraftDays > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        component: 'C4_stability',
        trigger: 'Découverts > 0 jours',
        title: 'Évitez les découverts',
        message: `Vous avez été à découvert ${scores.overdraftDays} jour(s) ce mois. Planifiez mieux vos dépenses en début de mois.`,
        source: 'CFPB Financial Well-Being Score',
      });
    }

    // RÈGLE 4 — Dépenses trop élevées
    // Source : Financial Health Network
    if (
      scores.expenseRatio >
      ANALYTICS_CONSTANTS.FINANCIAL_HEALTH_CRITICAL_EXPENSE_RATIO
    ) {
      recommendations.push({
        priority: 'HIGH',
        component: 'C1_expenses',
        trigger: `Ratio d\u00e9penses > ${ANALYTICS_CONSTANTS.FINANCIAL_HEALTH_CRITICAL_EXPENSE_RATIO}%`,
        title: 'Dépenses critiques',
        message: `Vous dépensez ${scores.expenseRatio}% de vos revenus. Il ne vous reste presque rien. Identifiez vos 3 plus grosses dépenses variables et réduisez-les de 20%.`,
        source: 'Financial Health Network — Pilier DÉPENSER',
      });
    } else if (
      scores.expenseRatio >
      ANALYTICS_CONSTANTS.FINANCIAL_HEALTH_EXPENSE_RATIO_THRESHOLD
    ) {
      recommendations.push({
        priority: 'MEDIUM',
        component: 'C1_expenses',
        trigger: `Ratio dépenses > ${ANALYTICS_CONSTANTS.FINANCIAL_HEALTH_EXPENSE_RATIO_THRESHOLD}%`,
        title: 'Réduisez vos dépenses',
        message: `Vous dépensez ${scores.expenseRatio}% de vos revenus ce mois. L'objectif recommandé est en dessous de ${ANALYTICS_CONSTANTS.FINANCIAL_HEALTH_EXPENSE_RATIO_THRESHOLD}%.`,
        source: 'Financial Health Network — Pilier DÉPENSER',
      });
    }

    // RÈGLE 5 — Revenus instables
    // Source : CFPB dimension stabilité
    if (scores.revenueVolatility > 50) {
      recommendations.push({
        priority: 'MEDIUM',
        component: 'C4_stability',
        trigger: 'volatilité revenus > 50%',
        title: 'Revenus très irréguliers',
        message: `Vos revenus varient fortement d'un mois à l'autre. Constituez un fonds d'urgence couvrant 3 mois de dépenses pour absorber les mois creux.`,
        source: 'CFPB — Sécurité financière future',
      });
    }

    // RÈGLE 6 — Régularité des remboursements
    // Source : FICO
    if (scores.repaymentRegularity < 75) {
      recommendations.push({
        priority: 'HIGH',
        component: 'C2_debt',
        trigger: 'régularité remboursements < 75%',
        title: 'Incidents de remboursement',
        message: `Vous avez manqué des échéances de crédit. Chaque incident impacte votre score et peut entrainer des pénalités. Contactez votre banque pour un rééchelonnement.`,
        source: 'FICO — Historique de paiement 35%',
      });
    }

    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return recommendations.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    ).map((r) => ({
      ...r,
      id: this.fingerprint(r),
    }));
  }

  private fingerprint(r: { title: string; message: string }): string {
    const str = `reco|${r.title}|${r.message}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `reco_${Math.abs(hash).toString(36)}`;
  }
}
