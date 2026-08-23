import { Injectable } from '@nestjs/common';
import { Classifier } from '../shared/classifier';
import { ExpenseCategory } from '../config/expense-keywords';

export interface DebtAssessment {
  isDebt: boolean;
  reason: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

@Injectable()
export class DebtDetector {
  private static readonly SUBSCRIPTION_TERMS = [
    'NETFLIX', 'SPOTIFY', 'CANAL', 'CANAL+', 'ABONNEMENT',
    'COTISATION', 'SALLE SPORT', 'ASSURANCE', 'MUTUELLE',
    'PREVOYANCE', 'YOUTUBE', 'DISNEY', 'AMAZON PRIME',
    'APPLE MUSIC', 'DEEZER', 'BOX INTERNET', 'FREEBOX',
    'ABONNEMENT TEL', 'FORFAIT', 'IPPTV', 'PASS SPORT',
    'SERVICE STREAMING', 'PRESSE', 'MAGAZINE',
  ];

  private static readonly DISBURSEMENT_TERMS = [
    'VERSEMENT PRET', 'DECAISSEMENT', 'MISE A DISPOSITION',
    'DEBLOQUER', 'FONDS PRET', 'VIREMENT PRET',
    'PRET ACCORDÉ', 'CREDIT ACCORDÉ', 'FINANCEMENT',
    'PRET PERSONNEL', 'CREDIT CONSOMMATION',
    'MONTANT PRET', 'DEBLOCAGE',
  ];

  private static readonly MIN_DEBT_AMOUNT = 5_000;

  constructor(private classifier: Classifier) {}

  isSubscription(description: string): boolean {
    const upper = description.toUpperCase();
    return DebtDetector.SUBSCRIPTION_TERMS.some((t) => upper.includes(t));
  }

  isDisbursement(description: string): boolean {
    const upper = description.toUpperCase();
    return DebtDetector.DISBURSEMENT_TERMS.some((t) => upper.includes(t));
  }

  async assessDebtPayment(
    description: string,
    amount: number,
    customerId?: string,
  ): Promise<DebtAssessment> {
    if (!description) {
      return { isDebt: false, reason: 'NO_DESCRIPTION', confidence: 'HIGH' };
    }

    if (this.isSubscription(description)) {
      return { isDebt: false, reason: 'SUBSCRIPTION', confidence: 'HIGH' };
    }

    if (amount < DebtDetector.MIN_DEBT_AMOUNT) {
      return { isDebt: false, reason: 'AMOUNT_TOO_LOW', confidence: 'MEDIUM' };
    }

    const category = await this.classifier.categorizeWithCache(
      description,
      customerId,
    );

    if (category !== ExpenseCategory.CREDIT) {
      return { isDebt: false, reason: 'NOT_CREDIT', confidence: 'HIGH' };
    }

    return { isDebt: true, reason: 'CLASSIFIER_CREDIT', confidence: 'HIGH' };
  }
}
