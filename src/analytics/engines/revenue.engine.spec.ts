import { RevenueEngine } from './revenue.engine';
import { Transaction, TransactionStatus } from '../types';

describe('RevenueEngine', () => {
  const customerId = 'cust-123';
  const otherId = 'cust-456';

  const mockTransactions: Transaction[] = [
    {
      id: 'tx1',
      amount: BigInt(1000),
      receiverCustomerId: customerId,
      senderCustomerId: otherId,
      transactionDate: new Date('2024-05-15'),
      createdAt: new Date('2024-05-15'),
      description: 'Salaire Mai',
      status: TransactionStatus.POSTED,
    },
    {
      id: 'tx2',
      amount: BigInt(500),
      receiverCustomerId: customerId,
      senderCustomerId: otherId,
      transactionDate: new Date('2024-05-20'),
      createdAt: new Date('2024-05-20'),
      description: 'Virement',
      status: TransactionStatus.POSTED,
    },
    {
      id: 'tx3',
      amount: BigInt(300),
      receiverCustomerId: otherId,
      senderCustomerId: customerId,
      transactionDate: new Date('2024-05-25'),
      createdAt: new Date('2024-05-25'),
      description: 'Loyer',
      status: TransactionStatus.POSTED,
    },
  ];

  describe('buildFinancialSummary', () => {
    it('should correctly sum credits and debits', () => {
      const period = {
        from: new Date('2024-05-01'),
        to: new Date('2024-05-31'),
      };
      const result = RevenueEngine.buildFinancialSummary(
        mockTransactions,
        customerId,
        period,
      );

      expect(result.totalCredits.amount).toBe(1500);
      expect(result.totalCredits.count).toBe(2);
      expect(result.totalDebits.amount).toBe(300);
      expect(result.totalDebits.count).toBe(1);
      expect(result.netFlow).toBe(1200);
    });
  });

  describe('monthlySummaryIncome', () => {
    it('should calculate monthly summary correctly', () => {
      // On force la date "aujourd'hui" pour le test si possible,
      // mais ici on va adapter les données pour qu'elles collent au mois actuel/précédent de l'exécution
      const now = new Date();
      // On utilise des dates UTC pour éviter les décalages de fuseau horaire dans les tests
      const currentMonthKey = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      )
        .toISOString()
        .slice(0, 7);
      const previousMonthKey = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
      )
        .toISOString()
        .slice(0, 7);

      const testTxs: Transaction[] = [
        {
          id: 'tx4',
          amount: BigInt(2000),
          receiverCustomerId: customerId,
          transactionDate: new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 5),
          ),
          createdAt: new Date(),
          status: TransactionStatus.POSTED,
        },
        {
          id: 'tx5',
          amount: BigInt(1000),
          receiverCustomerId: customerId,
          transactionDate: new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 10),
          ),
          createdAt: new Date(),
          status: TransactionStatus.POSTED,
        },
      ];

      const result = RevenueEngine.monthlySummaryIncome(testTxs, customerId);

      expect(result.currentMonth.total).toBe(2000);
      expect(result.currentMonth.month).toBe(currentMonthKey);
      expect(result.previousMonth.total).toBe(1000);
      expect(result.previousMonth.month).toBe(previousMonthKey);
      expect(result.variationPercent).toBe(100);
    });
  });

  describe('computeRevenueSources', () => {
    it('should categorize transactions correctly', () => {
      const from = new Date('2024-05-01');
      const to = new Date('2024-05-31');
      const result = RevenueEngine.computeRevenueSources(
        mockTransactions,
        customerId,
        from,
        to,
      );

      expect(result.totalAmount).toBe(1500);
      expect(result.dominantSource).toBe('SALAIRE');
      const salarySource = result.source.find((s) => s.category === 'SALAIRE');
      expect(salarySource?.amount).toBe(1500); // 1000 + 500 car "Virement" est aussi classé SALAIRE
      expect(salarySource?.percent).toBe(100);
    });
  });

  describe('computeIncomeFrequency', () => {
    it('should calculate stability metrics', () => {
      const now = new Date();
      const testTxs: Transaction[] = [
        {
          id: 'tx6',
          amount: BigInt(100),
          receiverCustomerId: customerId,
          transactionDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), // J-20
          createdAt: new Date(),
          status: TransactionStatus.POSTED,
        },
        {
          id: 'tx7',
          amount: BigInt(100),
          receiverCustomerId: customerId,
          transactionDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // J-10
          createdAt: new Date(),
          status: TransactionStatus.POSTED,
        },
        {
          id: 'tx8',
          amount: BigInt(100),
          receiverCustomerId: customerId,
          transactionDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // J-2
          createdAt: new Date(),
          status: TransactionStatus.POSTED,
        },
      ];

      const result = RevenueEngine.computeIncomeFrequency(testTxs, customerId);

      expect(result.entriesPerMonth).toBe(3);
      expect(result.averageIntervalDays).toBeGreaterThan(0);
      expect(result.stabilityScore).toBeGreaterThan(0);
    });

    it('should return insufficient data for < 2 transactions', () => {
      const result = RevenueEngine.computeIncomeFrequency([], customerId);
      expect(result.stabilityLabel).toBe('INSUFFICIENT_DATA');
    });
  });
});
