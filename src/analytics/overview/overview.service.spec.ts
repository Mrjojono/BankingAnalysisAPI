import { Test, TestingModule } from '@nestjs/testing';
import { OverviewService } from './overview.service';
import { Entry } from '../types';

jest.mock('natural', () => ({
  BayesClassifier: jest.fn().mockImplementation(() => ({
    addDocument: jest.fn(),
    train: jest.fn(),
    classify: jest.fn(() => 'DIVERS'),
  })),
}));
import { TransactionSourceRegistry } from '../sources/registry/transaction-source-registry';
import { BalanceReconstructor } from '../shared/balance.reconstructor';
import { ExpenseEngine } from '../engines/expense.engine';
import { RevenueEngine } from '../engines/revenue.engine';
import { BalanceEngine } from '../engines/balance.engine';
import { DebtEngine } from '../engines/debt.engine';
import { SavingsEngine } from '../engines/savings.engine';
import { ScoreEngine } from '../engines/score.engine';
import { RecommendationEngine } from '../engines/recommendation.engine';
import { AdviceEngine } from '../engines/advice.engine';
import { DashboardGateway } from '../../gateway/dashboard.gateway';
import { Classifier } from '../shared/classifier';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { RedisService } from '../../redis/redis.service';

describe('OverviewService.getSourceBreakdown', () => {
  let service: OverviewService;
  let sourceRegistry: {
    aggregateEntries: jest.Mock;
    getLatestTransactionDate: jest.Mock;
  };
  let gateway: { emit: jest.Mock };

  const mkEntry = (
    id: string,
    direction: 'DEBIT' | 'CREDIT',
    amount: number,
    source: string | undefined,
  ): Entry => ({
    id,
    direction,
    amount: BigInt(amount),
    transactionId: `tx-${id}`,
    accountId: `acc-${id}`,
    source,
    transaction: {
      id: `tx-${id}`,
      amount: BigInt(amount),
      createdAt: new Date('2026-07-01'),
      transactionDate: new Date('2026-07-01'),
    },
    account: {
      id: `acc-${id}`,
      code: 'x',
      name: 'x',
      glAccountType: 'ASSET',
      balanceType: 'DEBIT',
      settledBalance: BigInt(0),
    },
  });

  beforeEach(async () => {
    sourceRegistry = {
      aggregateEntries: jest.fn(),
      getLatestTransactionDate: jest.fn(),
    };
    gateway = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OverviewService,
        { provide: TransactionSourceRegistry, useValue: sourceRegistry },
        { provide: BalanceReconstructor, useValue: {} },
        { provide: ExpenseEngine, useValue: {} },
        { provide: RevenueEngine, useValue: {} },
        { provide: BalanceEngine, useValue: {} },
        { provide: DebtEngine, useValue: {} },
        { provide: SavingsEngine, useValue: {} },
        { provide: ScoreEngine, useValue: {} },
        { provide: RecommendationEngine, useValue: {} },
        { provide: AdviceEngine, useValue: {} },
        { provide: DashboardGateway, useValue: gateway },
        { provide: Classifier, useValue: {} },
        { provide: PrismaService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
        { provide: RedisService, useValue: {} },
      ],
    }).compile();

    service = module.get<OverviewService>(OverviewService);
  });

  it('sépare les écritures par source et calcule crédits/débits/netFlow', async () => {
    const from = new Date('2026-01-01');
    const to = new Date('2026-12-31');
    sourceRegistry.aggregateEntries.mockResolvedValue([
      mkEntry('b1', 'CREDIT', 1000, 'bank'),
      mkEntry('b2', 'DEBIT', 400, 'bank'),
      mkEntry('s1', 'CREDIT', 300, 'sms'),
      mkEntry('s2', 'DEBIT', 100, 'sms'),
    ]);

    const result = await service.getSourceBreakdown('cid', from, to);

    expect(result.period).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
    });
    expect(result.bank).toEqual({
      totalCredits: { count: 1, amount: 1000 },
      totalDebits: { count: 1, amount: 400 },
      netFlow: 600,
    });
    expect(result.sms).toEqual({
      totalCredits: { count: 1, amount: 300 },
      totalDebits: { count: 1, amount: 100 },
      netFlow: 200,
    });
    expect(sourceRegistry.aggregateEntries).toHaveBeenCalledWith(
      'cid',
      from,
      to,
    );
  });

  it('attribue les écritures sans source à la banque', async () => {
    const from = new Date('2026-01-01');
    const to = new Date('2026-12-31');
    sourceRegistry.aggregateEntries.mockResolvedValue([
      mkEntry('x1', 'CREDIT', 500, undefined),
    ]);

    const result = await service.getSourceBreakdown('cid', from, to);

    expect(result.bank.totalCredits.amount).toBe(500);
    expect(result.sms.totalCredits.amount).toBe(0);
  });
});
