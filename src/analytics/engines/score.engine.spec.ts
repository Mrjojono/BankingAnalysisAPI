import { Test, TestingModule } from '@nestjs/testing';
import { ScoreEngine } from './score.engine';

describe('ScoreEngine', () => {
  let engine: ScoreEngine;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScoreEngine],
    }).compile();
    engine = module.get<ScoreEngine>(ScoreEngine);
  });

  it('should cap score at 50 when debtRatio exceeds 33', async () => {
    const metrics = {
      expenseRatioScore: 80,
      paymentRegularityScore: 80,
      debtRatioScore: 90,
      repaymentRegularityScore: 80,
      creditUtilizationScore: 80,
      savingsRateScore: 80,
      emergencyFundScore: 80,
      savingsRegularityScore: 80,
      overdraftScore: 80,
      revenueVolatilityScore: 80,
      balanceVolatilityScore: 80,
      negativeBalanceScore: 80,
      debtRatio: 40,
      monthsData: 12,
    };
    const result = await engine.calculateGlobalScore(metrics);
    expect(result.globalScore).toBeLessThanOrEqual(50);
  });

  it('should allow score above 50 when debtRatio is below 33', async () => {
    const metrics = {
      expenseRatioScore: 80,
      paymentRegularityScore: 80,
      debtRatioScore: 90,
      repaymentRegularityScore: 80,
      creditUtilizationScore: 80,
      savingsRateScore: 80,
      emergencyFundScore: 80,
      savingsRegularityScore: 80,
      overdraftScore: 80,
      revenueVolatilityScore: 80,
      balanceVolatilityScore: 80,
      negativeBalanceScore: 80,
      debtRatio: 20,
      monthsData: 12,
    };
    const result = await engine.calculateGlobalScore(metrics);
    expect(result.globalScore).toBeGreaterThan(50);
  });
});
