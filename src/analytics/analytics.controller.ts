import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { OverviewService } from './overview/overview.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  AnalyticsQueryDto,
  RevenueVariationQueryDto,
  ClassifierFeedbackDto,
} from './dto/analytics-query.dto';
import {
  CashFlowAnalyticsDto,
  FullOverviewResponseDto,
  IncomeFrequencyDto,
  RevenueAnalyticsDto,
  RevenueSourcesResponseDto,
  RevenueVariationResponseDto,
  ExpenseDto,
  CategoryExpenseDto,
  RecurringExpenseDto,
  VariableExpenseAnalyticsDto,
  ExpenseRatioDto,
  AverageBalanceResponseDto,
  BalanceExtremesResponseDto,
  OverdraftAnalyticsResponseDto,
  NegativePeriodsResponseDto,
  BalanceVolatilityResponseDto,
  DebtDto,
} from './dto/score-response.dto';
import { parseUtcDate } from './helper';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private overviewService: OverviewService) {}

  /**
   * Vue d'ensemble complète.
   * Si year/month non fournis, utilise la période de la dernière transaction connue.
   */
  @Get(':customerId/overview')
  @ApiOperation({
    summary: 'Obtenir une vue d’ensemble complète des analyses',
  })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, type: FullOverviewResponseDto })
  async getOverview(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.overviewService.getFullOverview(
      customerId,
      query.year,
      query.month,
    );
  }

  /**
   * CashFlow analytique.
   */
  @Get(':customerId/revenues/cashflow')
  @ApiOperation({ summary: 'Obtenir le flux de trésorerie (CashFlow)' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, type: CashFlowAnalyticsDto })
  async getCashFlow(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    const fromDate = query.from ? parseUtcDate(query.from) : undefined;
    const toDate = query.to ? parseUtcDate(query.to) : undefined;

    return this.overviewService.getCashFlow(
      customerId,
      fromDate,
      toDate,
      query.year,
      query.month,
    );
  }

  @Get(':customerId/revenues/monthly')
  @ApiOperation({ summary: 'Obtenir les analyses de revenus mensuels' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, type: RevenueAnalyticsDto })
  async getRevenueAnalytics(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.overviewService.getRevenueAnalytics(
      customerId,
      query.year,
      query.month,
    );
  }

  @Get(':customerId/revenues/summary')
  @ApiOperation({ summary: 'Obtenir un résumé des revenus mensuels' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, type: RevenueAnalyticsDto })
  async getMonthlySummary(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.overviewService.getMonthlySummary(
      customerId,
      query.year,
      query.month,
    );
  }

  @Get(':customerId/revenues/frequency')
  @ApiOperation({ summary: 'Obtenir la fréquence des revenus' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, type: IncomeFrequencyDto })
  async getIncomeFrequency(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.overviewService.getIncomeFrequency(
      customerId,
      query.year,
      query.month,
    );
  }

  @Get(':customerId/revenues/sources')
  @ApiOperation({ summary: 'Obtenir les sources de revenus' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, type: RevenueSourcesResponseDto })
  async getRevenueSources(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    const fromDate = query.from ? parseUtcDate(query.from) : undefined;
    const toDate = query.to ? parseUtcDate(query.to) : undefined;

    return this.overviewService.getRevenueSources(
      customerId,
      fromDate,
      toDate,
      query.year,
      query.month,
    );
  }

  @Get(':customerId/revenues/variation')
  @ApiOperation({ summary: 'Obtenir la variation des revenus sur N mois' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, type: RevenueVariationResponseDto })
  async getRevenueVariation(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: RevenueVariationQueryDto,
  ) {
    return this.overviewService.getRevenueVariation(
      customerId,
      query.months ?? 6,
      query.year,
      query.month,
    );
  }

  // --- ANALYSE DES DÉPENSES  ---

  @Get(':customerId/expenses/detect')
  @ApiOperation({
    summary: 'Détecter et résumer les dépenses',
  })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, type: ExpenseDto })
  async detectExpenses(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    const fromDate = query.from ? parseUtcDate(query.from) : undefined;
    const toDate = query.to ? parseUtcDate(query.to) : undefined;

    return this.overviewService.getExpenses(
      customerId,
      fromDate,
      toDate,
      query.year,
      query.month,
    );
  }

  @Get(':customerId/expenses/categories')
  @ApiOperation({
    summary: 'Obtenir les dépenses par catégorie',
  })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, type: CategoryExpenseDto })
  async getExpenseCategories(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    const fromDate = query.from ? parseUtcDate(query.from) : undefined;
    const toDate = query.to ? parseUtcDate(query.to) : undefined;

    return this.overviewService.getCategoryExpenses(
      customerId,
      fromDate,
      toDate,
      query.year,
      query.month,
    );
  }

  @Get(':customerId/expenses/recurring')
  @ApiOperation({
    summary: 'Détecter les dépenses récurrentes ',
  })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, type: RecurringExpenseDto })
  async getRecurringExpenses(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('months') months?: number,
    @Query() query?: AnalyticsQueryDto,
  ) {
    return this.overviewService.getRecurringExpenses(
      customerId,
      months,
      query?.year,
      query?.month,
    );
  }

  @Get(':customerId/expenses/variable')
  @ApiOperation({
    summary: 'Analyser les dépenses variables vs récurrentes',
  })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, type: VariableExpenseAnalyticsDto })
  async getVariableExpenses(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    const fromDate = query.from ? parseUtcDate(query.from) : undefined;
    const toDate = query.to ? parseUtcDate(query.to) : undefined;

    return this.overviewService.getVariableExpenses(
      customerId,
      fromDate,
      toDate,
      query.year,
      query.month,
    );
  }

  @Get(':customerId/expenses/ratio')
  @ApiOperation({
    summary: 'Calculer le ratio dépenses / revenus ',
  })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, type: ExpenseRatioDto })
  async getExpenseRatio(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    const fromDate = query.from ? parseUtcDate(query.from) : undefined;
    const toDate = query.to ? parseUtcDate(query.to) : undefined;

    return this.overviewService.getExpenseRatio(
      customerId,
      fromDate,
      toDate,
      query.year,
      query.month,
    );
  }

  // --- ANALYSE DU SOLDE  ---

  @Get(':customerId/balance/average')
  @ApiOperation({ summary: 'Obtenir le solde moyen mensuel' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, type: AverageBalanceResponseDto })
  async getAverageBalance(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.overviewService.getAverageBalance(
      customerId,
      query.year,
      query.month,
    );
  }

  @Get(':customerId/balance/extremes')
  @ApiOperation({ summary: 'Obtenir les soldes minimum et maximum' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, type: BalanceExtremesResponseDto })
  async getBalanceExtremes(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.overviewService.getBalanceExtremes(
      customerId,
      query.year,
      query.month,
    );
  }

  @Get(':customerId/balance/overdrafts')
  @ApiOperation({
    summary: 'Analyser la fréquence des découvertes',
  })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, type: OverdraftAnalyticsResponseDto })
  async getOverdraftFrequency(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.overviewService.getOverdraftFrequency(
      customerId,
      query.year,
      query.month,
    );
  }

  @Get(':customerId/balance/negative-periods')
  @ApiOperation({
    summary: 'Analyser la durée des périodes négatives',
  })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, type: NegativePeriodsResponseDto })
  async getNegativePeriods(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.overviewService.getNegativePeriods(
      customerId,
      query.year,
      query.month,
    );
  }

  @Get(':customerId/balance/volatility')
  @ApiOperation({ summary: 'Analyser la volatilité du solde' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, type: BalanceVolatilityResponseDto })
  async getBalanceVolatility(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.overviewService.getBalanceVolatility(
      customerId,
      query.year,
      query.month,
    );
  }

  // --- ANALYSE DES DETTES  ---

  @Get(':customerId/debts/detect')
  @ApiOperation({ summary: 'Détecter les dettes et remboursements' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, type: DebtDto })
  async detectDebts(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    const fromDate = query.from ? parseUtcDate(query.from) : undefined;
    const toDate = query.to ? parseUtcDate(query.to) : undefined;

    return this.overviewService.getDebtAnalytics(
      customerId,
      fromDate,
      toDate,
      query.year,
      query.month,
    );
  }

  @Get(':customerId/debt/total')
  @ApiOperation({ summary: 'Estimer le montant total des dettes' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  async getTotalDebt(@Param('customerId', ParseUUIDPipe) customerId: string) {
    return this.overviewService.getTotalDebt(customerId);
  }

  @Get(':customerId/debt/monthly-payments')
  @ApiOperation({ summary: 'Analyser les mensualites de dette' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  async getMonthlyPayments(
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ) {
    return this.overviewService.getMonthlyPayments(customerId);
  }

  @Get(':customerId/debt/ratio')
  @ApiOperation({ summary: "Calculer le taux d'endettement" })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  async getDebtRatio(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.overviewService.getDebtRatio(
      customerId,
      query.year,
      query.month,
    );
  }

  @Get(':customerId/debt/repayment-history')
  @ApiOperation({
    summary: "Analyser l'historique de remboursement",
  })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  async getRepaymentHistory(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('months') months?: number,
  ) {
    return this.overviewService.getRepaymentHistory(customerId, months || 6);
  }

  // --- GLOBAL SCORE (EPIC 06) ---

  @Get(':customerId/score')
  @ApiOperation({ summary: 'Obtenir le score financier global' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  async getGlobalScore(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.overviewService.getGlobalScore(
      customerId,
      query.year,
      query.month,
    );
  }

  @Get(':customerId/score/explanation')
  @ApiOperation({ summary: 'Obtenir l’explication du score financier' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  async getScoreExplanation(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.overviewService.getScoreExplanation(
      customerId,
      query.year,
      query.month,
    );
  }

  @Get(':customerId/score/history')
  @ApiOperation({ summary: 'Obtenir l’historique du score financier' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  async getScoreHistory(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('months') months?: number,
  ) {
    return this.overviewService.getScoreHistory(customerId, months || 6);
  }

  @Get(':customerId/score/recommendations')
  @ApiOperation({ summary: 'Obtenir les recommandations automatiques' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  async getRecommendations(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.overviewService.getRecommendations(
      customerId,
      query.year,
      query.month,
    );
  }

  // --- CONSEILS PERSONNALISÉS (PERSONAL ADVICE) ---

  @Get(':customerId/advice')
  @ApiOperation({ summary: 'Obtenir des conseils financiers personnalisés' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  async getPersonalAdvice(
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ) {
    return this.overviewService.getPersonalAdvice(customerId);
  }

  // --- ANALYSE DE L'ÉPARGNE (EPIC 05) ---

  @Get(':customerId/savings/rate')
  @ApiOperation({ summary: "Calculer le taux d'épargne mensuel" })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  async getSavingsRate(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.overviewService.getSavingsRate(
      customerId,
      query.year,
      query.month,
    );
  }

  @Get(':customerId/savings/frequency')
  @ApiOperation({ summary: "Analyser la fréquence des dépôts d'épargne" })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  async getSavingsFrequency(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('months') months?: number,
  ) {
    return this.overviewService.getSavingsFrequency(customerId, months || 6);
  }

  @Get(':customerId/savings/retention')
  @ApiOperation({ summary: 'Analyser la capacité de rétention du revenu' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  async getRetentionCapacity(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('months') months?: number,
  ) {
    return this.overviewService.getRetentionCapacity(customerId, months || 3);
  }

  // --- CLASSIFIER PREVIEW & FEEDBACK (Pour le Dashboard) ---

  @Get('classifier/preview')
  @ApiOperation({ summary: 'Prévisualiser la classification pour un client' })
  async previewClassification(
    @Query('customerId') customerId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? parseUtcDate(from) : undefined;
    const toDate = to ? parseUtcDate(to) : undefined;
    return this.overviewService.previewClassifier(customerId, fromDate, toDate);
  }

  @Post('classifier/feedback')
  @ApiOperation({ summary: 'Enregistrer un feedback de classification' })
  async saveFeedback(@Body() body: ClassifierFeedbackDto) {
    return this.overviewService.recordFeedback(
      body.customerId,
      body.description,
      body.correctCategory,
    );
  }
}
