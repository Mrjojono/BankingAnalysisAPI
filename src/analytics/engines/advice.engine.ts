import { Injectable } from '@nestjs/common';
import { TransactionSourceRegistry } from '../sources/registry/transaction-source-registry';
import { Classifier } from '../shared/classifier';
import { filterEntries } from '../helper';
import { InterpreterEngine, type RuleContext } from './interpreter.engine';
import {
  realizeIntent,
  renderAdviceTemplate,
  getCategoryLabel,
} from '../../messages/realizer';
import type { PersonalAdvice } from '../../messages/intents';
import type { Entry } from '../types';

type CategoryTotals = {
  category: string;
  amount: number;
  count: number;
  percent: number;
  descriptions: string[];
};

@Injectable()
export class AdviceEngine {
  constructor(
    private sourceRegistry: TransactionSourceRegistry,
    private classifier: Classifier,
    private interpreter: InterpreterEngine,
  ) {}

  async generate(customerId: string): Promise<PersonalAdvice[]> {
    const allAdvice: PersonalAdvice[] = [];

    const now = new Date();
    const currentStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const currentEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
    );
    const prevStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
    );
    const prevEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999),
    );

    const allEntries = await this.sourceRegistry.aggregateEntries(customerId);
    if (allEntries.length === 0) return allAdvice;

    // recuperation des transactions actuelles et precedentes en les filtrant pour chaque categories
    const currentDebits = filterEntries(allEntries, {
      direction: 'DEBIT',
      accountType: 'CHECKING',
      includeMobileMoney: true,
      from: currentStart,
      to: currentEnd,
    });
    const prevDebits = filterEntries(allEntries, {
      direction: 'DEBIT',
      accountType: 'CHECKING',
      includeMobileMoney: true,
      from: prevStart,
      to: prevEnd,
    });
    const currentCredits = filterEntries(allEntries, {
      direction: 'CREDIT',
      accountType: 'CHECKING',
      includeMobileMoney: true,
      from: currentStart,
      to: currentEnd,
    });
    const prevCredits = filterEntries(allEntries, {
      direction: 'CREDIT',
      accountType: 'CHECKING',
      includeMobileMoney: true,
      from: prevStart,
      to: prevEnd,
    });

    const [currentCats, prevCats] = await Promise.all([
      this.computeCategoryTotals(currentDebits, customerId),
      this.computeCategoryTotals(prevDebits, customerId),
    ]);

    const totalRevenue = currentCredits.reduce(
      (s, e) => s + Number(e.amount),
      0,
    );
    const totalExpenses = currentCats.reduce((s, c) => s + c.amount, 0);
    const prevRevenue = prevCredits.reduce((s, e) => s + Number(e.amount), 0);
    const expenseRatio =
      totalRevenue > 0 ? Math.round((totalExpenses / totalRevenue) * 100) : 0;

    for (const cat of currentCats) {
      const label = getCategoryLabel(cat.category);
      const prev = prevCats.find((c) => c.category === cat.category);
      const prevAmount = prev?.amount ?? 0;
      const change =
        prevAmount > 0
          ? Math.round(((cat.amount - prevAmount) / prevAmount) * 100)
          : null;

      const ctx: RuleContext = {
        category: cat.category,
        label,
        amount: cat.amount,
        percent: cat.percent,
        prevAmount,
        change,
        totalRevenue,
        totalExpenses,
        expenseRatio,
        descriptions: cat.descriptions,
      };

      const intents = this.interpreter.interpret(ctx);
      for (const intent of intents) {
        allAdvice.push(realizeIntent(intent));
      }
    }

    if (prevRevenue > 0) {
      const revenueChange = Math.round(
        ((totalRevenue - prevRevenue) / prevRevenue) * 100,
      );
      if (revenueChange < -20) {
        const vars = {
          percent: Math.abs(revenueChange),
          current: totalRevenue,
          previous: prevRevenue,
        };
        allAdvice.push({
          type: 'INCOME_DROP',
          severity: 'CRITICAL',
          title: `Baisse de revenus de ${Math.abs(revenueChange)}%`,
          message: renderAdviceTemplate(
            'INCOME_DROP',
            vars,
            stableHash(customerId, 3),
          ),
          action:
            'Évitez tout nouvel engagement. Réduisez vos dépenses variables.',
          metric: {
            current: totalRevenue,
            previous: prevRevenue,
            change: revenueChange,
          },
        });
      }
    }

    if (totalRevenue > 0) {
      if (expenseRatio > 90) {
        const vars = { percent: expenseRatio };
        allAdvice.push({
          type: 'HIGH_EXPENSE_RATIO',
          severity: 'CRITICAL',
          title: `${expenseRatio}% des revenus dépensés`,
          message: renderAdviceTemplate(
            'HIGH_EXPENSE_RATIO',
            vars,
            stableHash(customerId, 4),
          ),
          action: `Il ne vous reste que ${100 - expenseRatio}% de vos revenus. Priorité : réduisez vos plus gros postes variables.`,
          metric: { current: expenseRatio, threshold: 75 },
        });
      } else if (expenseRatio > 75) {
        const vars = { percent: expenseRatio };
        allAdvice.push({
          type: 'HIGH_EXPENSE_RATIO',
          severity: 'WARNING',
          title: `Dépenses : ${expenseRatio}% des revenus`,
          message: renderAdviceTemplate(
            'HIGH_EXPENSE_RATIO',
            vars,
            stableHash(customerId, 5),
          ),
          action: `Réduisez de ${Math.round(totalRevenue * 0.1).toLocaleString('fr-FR')} FCFA pour atteindre 75%.`,
          metric: { current: expenseRatio, threshold: 75 },
        });
      } else if (expenseRatio < 50) {
        allAdvice.push({
          type: 'GOOD_HABIT',
          severity: 'INFO',
          title: `Dépenses maîtrisées : ${expenseRatio}%`,
          message: `Vous ne dépensez que ${expenseRatio}% de vos revenus. C'est une excellente base pour épargner. Visez ${Math.round(totalRevenue * 0.2).toLocaleString('fr-FR')} FCFA d'épargne mensuelle.`,
          action: `Mettez en place un virement automatique de ${Math.round(totalRevenue * 0.2).toLocaleString('fr-FR')} FCFA vers un compte épargne.`,
          metric: { current: expenseRatio, threshold: 75 },
        });
      }
    }

    const overdraftFees = currentDebits.filter(
      (e) =>
        (e.transaction.description ?? '').toUpperCase().includes('AGIO') ||
        (e.transaction.description ?? '').toUpperCase().includes('DECOUVERT'),
    ).length;
    if (overdraftFees > 0) {
      const reserve = Math.round(totalRevenue * 0.3);
      const vars = { count: overdraftFees, reserve };
      allAdvice.push({
        type: 'OVERDRAFT_RISK',
        severity: overdraftFees > 3 ? 'CRITICAL' : 'WARNING',
        title: overdraftFees > 3 ? 'Découverts répétés' : 'Frais de découvert',
        message: renderAdviceTemplate(
          'OVERDRAFT',
          vars,
          stableHash(customerId, 7),
        ),
        action: `Constituez une réserve de ${reserve.toLocaleString('fr-FR')} FCFA pour éviter ces frais.`,
        metric: { current: overdraftFees, threshold: 3 },
      });
    }

    return allAdvice;
  }

  private async computeCategoryTotals(
    entries: Entry[],
    customerId: string,
  ): Promise<CategoryTotals[]> {
    const grouped = new Map<
      string,
      {
        amount: number;
        count: number;
        descriptions: string[];
      }
    >();

    for (const entry of entries) {
      const category = await this.classifier.categorizeWithCache(
        entry.transaction.description ?? '',
        customerId,
      );
      const amount = Number(entry.amount);
      const desc = entry.transaction.description ?? '';
      const existing = grouped.get(category);
      if (existing) {
        existing.amount += amount;
        existing.count += 1;
        existing.descriptions.push(desc);
      } else {
        grouped.set(category, { amount, count: 1, descriptions: [desc] });
      }
    }

    const total = [...grouped.values()].reduce((s, g) => s + g.amount, 0);
    return [...grouped.entries()]
      .map(([category, { amount, count, descriptions }]) => ({
        category,
        amount,
        count,
        percent: total > 0 ? Math.round((amount / total) * 100) : 0,
        descriptions,
      }))
      .sort((a, b) => b.amount - a.amount);
  }
}

function stableHash(str: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) & 0x7fffffff;
  }
  return h;
}
