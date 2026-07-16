# API Orabank — Types complets pour le frontend

> Tous les types TypeScript exportables pour consommer l'API.

---


## Sommaire

- [Auth](#auth)
- [Admin](#admin)
- [Analytics](#analytics)
- [Éligibilité](#eligibility)
- [SMS](#sms)
- [Mail](#mail)
- [Notifications](#notifications)
- [MFA (Multi-Factor Authentication)](#mfa-multi-factor-authentication)
- [Logs (admin)](#logs-admin)
- [WebSocket](#websocket)
- [Enums & Constantes partagées](#enums--constantes-partages)

---

## Auth

### Requêtes

```typescript
// POST /auth/register
export interface RegisterDto {
  accountNumber: string;       // 10 chiffres, regex: /^[0-9]{10}$/
  contact?: string;            // email ou téléphone (step 2)
  contactType?: 'email' | 'phone'; // step 2
  otp?: string;                // 6 chiffres (step 3)
  password?: string;           // min 8 caractères (step 4)
}

// POST /auth/login
export interface LoginDto {
  contact: string;  // email (transformé en lowercase)
  password: string;
}

// POST /auth/refresh
export interface RefreshTokenDto {
  refreshToken: string;
}

// POST /auth/forgot-password
export interface ForgotPasswordDto {
  contact: string;      // email (step 1)
  otp?: string;         // 6 chiffres (step 2)
  newPassword?: string; // min 8 caractères (step 3)
}

// POST /auth/resend-otp
export interface ResendOtpDto {
  accountNumber: string;
}
```

### Réponses

```typescript
// POST /auth/register — Response (chaque étape)
export interface AuthResponseDto {
  step: string;                              // "verify_contact" | "verify_otp" | "set_password" | "complete"
  message: string;                           // "Compte trouvé. Entrez votre email ou téléphone." etc.
  token?: string;                            // JWT (uniquement à step "complete")
}

// POST /auth/login — Response
export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;     // "CLIENT" | "AGENT" | "ADMIN" | "SUPER_ADMIN"
    username?: string;
  };
}

// POST /auth/me — Response
export interface MeResponseDto {
  id: string;
  email: string;
  role: string;
  username?: string;  // prénom + nom du BankCustomer
}

// POST /auth/refresh — Response
export interface RefreshResponseDto {
  accessToken: string;
  refreshToken: string;
}

// POST /auth/logout — Response
// POST /auth/resend-otp — Response
export interface MessageResponseDto {
  message: string;  // "Déconnecté avec succès" | "Nouveau code OTP envoyé."
}

// POST /auth/forgot-password — Response (chaque étape)
// Même shape que AuthResponseDto
export interface ForgotPasswordResponseDto {
  step: string;     // "verify_otp" | "reset_password" | "complete"
  message: string;
}
```

### États internes (register multi-step)

```typescript
export interface RegisterState {
  otp: string;
  step: string;
  customerId: string;
  contact: string;
  contactType: 'email' | 'phone';
  userId?: string;
}
```

---

## Admin

### Produits bancaires

```typescript
// Modèle Prisma
export interface BankProduct {
  id: string;          // UUID
  code: string;        // unique, ex: "COMPTES_PART"
  name: string;
  description?: string;
  reference?: string;
  category?: string;   // "ACCOUNT" | "CARD" | "LOAN"
  isActive: boolean;
  rules: Rule[];
}

// PUT /api/admin/products/:id/rules — Request
export interface LinkRulesDto {
  ruleIds: string[];   // UUIDs
}

// PUT /api/admin/products/:id/rules — Response
export interface LinkRulesResponse {
  cleared: number;     // nombre de règles déliées
  updated: number;     // nombre de règles liées
}
```

### Règles

```typescript
export interface Rule {
  id: string;            // UUID
  productId?: string;    // UUID
  code: string;          // unique par produit
  label: string;
  description?: string;
  type: RuleType;
  field: string;
  operator?: RuleOperator;
  value?: number;
  valueMin?: number;
  valueMax?: number;
  percentage?: number;
  flatAmount?: number;
  minAmount?: number;
  maxAmount?: number;
  currency?: Currency;
  period?: RulePeriod;
  conditions?: Record<string, any>;
  weight: number;        // défaut: 0
  priority: number;      // défaut: 0
  isActive: boolean;
}
```

### Catalogue messages

```typescript
// GET /api/admin/catalog — Response
export type CatalogJson = Record<string, any>;
// Contenu du fichier src/messages/catalog.json

// PUT /api/admin/catalog — Request
export type UpdateCatalogDto = Record<string, any>;
```

### Classifieur / Embeddings

```typescript
// GET /api/admin/classifier/test?desc=...
export interface ClassifierTestResult {
  // Résultat du test du classifieur sur une description
  category: ExpenseCategory;
  score: number;
  // ...
}

// GET /api/admin/embedding/stats — Response
export interface EmbeddingStats {
  vocabSize: number;
  categoryCoverage: Record<string, number>;
  // ...
}

// GET /api/admin/embedding/neighbors?desc=...&n=...
export interface NeighborsResult {
  neighbors: Array<{ description: string; similarity: number; category: string }>;
}

// POST /api/admin/training/run — Request
export interface TrainingRunDto {
  epochs?: number;    // défaut: 50
  lr?: number;        // défaut: 0.001
  layers?: 1 | 2;     // défaut: 1
  margin?: number;    // défaut: 0.1
}

// POST /api/admin/training/run — Response
export interface TrainingResult {
  config: TrainingConfig;
  finalAccuracy: number;
  metrics: TrainingMetrics[];
  W1: WeightMatrix;
  W2: WeightMatrix | null;
}

export interface TrainingConfig {
  epochs: number;
  learningRate: number;
  margin: number;
  dataFile: string;
  layers: 1 | 2;
}

export interface TrainingMetrics {
  epoch: number;
  loss: number;
  accuracy: number;
  top3Accuracy: number;
}

export type WeightMatrix = number[][];
export type FeatureVector = number[];

// POST /api/admin/sms/debug — Request
export interface SmsDebugDto {
  address: string;
  body: string;
  dateSent?: string;  // ISO date
}

// POST /api/admin/sms/debug — Response
export interface SmsDebugResult {
  steps: {
    parseSms: ParsedSms;
    dateValidation: { raw: string; valid: boolean };
    classifier: Record<string, any>;
  };
  verdict: 'INSERT' | 'SKIP';
  reason: string;
}
```

---

## Analytics

### Paramètres communs

```typescript
// Query params pour TOUS les endpoints analytics
export interface AnalyticsQueryDto {
  from?: string;   // YYYY-MM-DD
  to?: string;     // YYYY-MM-DD
  year?: number;
  month?: number;  // 1-12
}

export interface RevenueVariationQueryDto {
  from?: string;
  to?: string;
  months?: number;   // défaut: 6
  year?: number;
  month?: number;
}
```

### Overview — `GET /analytics/:customerId/overview`

```typescript
export interface FullOverviewResponseDto {
  cashFlow: CashFlowAnalyticsDto;
  revenueAnalytics: RevenueAnalyticsDto;
  monthlySummary: RevenueAnalyticsDto;
  incomeFrequency: IncomeFrequencyDto;
  revenueSources: RevenueSourcesResponseDto;
  revenueVariation: RevenueVariationResponseDto;
}
```

### Revenus

```typescript
// GET .../revenues/cashflow
export interface CashFlowAnalyticsDto {
  period: { from: string; to: string };
  totalCredits: { count: number; amount: number };
  totalDebits: { count: number; amount: number };
  netFlow: number;
}

// GET .../revenues/monthly
// GET .../revenues/summary
export interface RevenueAnalyticsDto {
  currentMonth: MonthTotalDto;
  previousMonth: MonthTotalDto;
  averageLast6Months: number;
  variationPercent: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  rolling30Days: number;
}

export interface MonthTotalDto {
  total: number;
  month: string;  // "2024-05"
}

// GET .../revenues/frequency
export interface IncomeFrequencyDto {
  entriesPerMonth: number;
  entriesPerWeek: number;
  averageIntervalDays: number;
  stabilityStdDev: number;
  coefficientOfVariation: number;
  stabilityLabel: string;  // "STABLE" | "VARIABLE" | "IRREGULIER"
  stabilityScore: number;  // 0-100
}

// GET .../revenues/sources
export interface RevenueSourcesResponseDto {
  source: RevenueSourceDto[];
  totalAmount: number;
  dominantSource: string;
}

export interface RevenueSourceDto {
  category: string;    // "SALARY" | "MOBILE_MONEY" | etc.
  amount: number;
  percent: number;
  count: number;
}

// GET .../revenues/variation
export interface RevenueVariationResponseDto {
  monthlyRevenues: MonthlyRevenueDto[];
  averageVariationPercent: number;
  stdDev: number;
  coefficientOfVariation: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  volatilityScore: number;  // 0-100
}

export interface MonthlyRevenueDto {
  month: string;
  amount: number;
  variationPercent: number | null;
}
```

### Dépenses

```typescript
// GET .../expenses/detect
export interface ExpenseDto {
  totalExpenses: number;
  count: number;
  averageTransactionAmount: number;
  largestExpense: {
    amount: number;
    description: string;
    date: string;
  };
}

// GET .../expenses/categories
export interface CategoryExpenseDto {
  categories: CategoryDto[];
  totalExpenses: number;
}

export interface CategoryDto {
  category: string;    // "LOGEMENT" | "ALIMENTATION" | etc.
  amount: number;
  percent: number;
  count: number;
}

// GET .../expenses/recurring
export interface RecurringExpenseDto {
  recurringExpenses: RecurringExpenseItemDto[];
  totalRecurringAmount: number;
  totalRecurringCount: number;
}

export interface RecurringExpenseItemDto {
  description: string;
  averageAmount: number;
  frequency: string;       // "MONTHLY"
  occurrences: number;
  nextExpectedDate: string;
  category: string;
}

// GET .../expenses/variable
export interface VariableExpenseAnalyticsDto {
  totalExpenses: number;
  recurringExpenses: number;
  variableExpenses: number;
  variablePercent: number;
  variableTransactions: VariableTransactionDto[];
}

export interface VariableTransactionDto {
  description: string;
  amount: number;
  date: string;
}

// GET .../expenses/ratio
export interface ExpenseRatioDto {
  totalRevenues: number;
  totalExpenses: number;
  ratio: number;              // pourcentage
  ratioLabel: string;         // "ATTENTION" | "SAIN" | "CRITIQUE"
  score: number;              // 0-100
  interpretation: string;     // "Vous dépensez 76% de vos revenus ce mois"
}
```

### Solde

```typescript
// GET .../balance/average
export interface AverageBalanceResponseDto {
  month: string;
  averageBalance: number;
  dailyBalances: DailyBalanceDto[];
}

export interface DailyBalanceDto {
  date: string;      // "2024-01-01"
  balance: number;
}

// GET .../balance/extremes
export interface BalanceExtremesResponseDto {
  minimum: { amount: number; date: string };
  maximum: { amount: number; date: string };
  range: number;
}

// GET .../balance/overdrafts
export interface OverdraftAnalyticsResponseDto {
  overdraftDays: number;
  totalDays: number;
  overdraftRate: number;
  overdraftLabel: string;     // "ATTENTION" | "SAIN" | "CRITIQUE"
  score: number;              // 0-100
  overdraftDates: string[];
}

// GET .../balance/negative-periods
export interface NegativePeriodsResponseDto {
  negativePeriods: NegativePeriodDto[];
  totalNegativeDays: number;
  averageDuration: number;
  maxDuration: number;
  longestPeriod: { from: string; to: string } | null;
}

export interface NegativePeriodDto {
  from: string;
  to: string;
  durationDays: number;
  minBalance: number;
}

// GET .../balance/volatility
export interface BalanceVolatilityResponseDto {
  averageBalance: number;
  stdDev: number;
  coefficientOfVariation: number;
  score: number;  // 0-100
}
```

### Dettes

```typescript
// GET .../debts/detect
export interface DebtDto {
  detectedCredits: DetectedCreditDto[];
  totalMonthlyDebt: number;
}

export interface DetectedCreditDto {
  description: string;
  monthlyAmount: number;
  firstDetected: string;
  occurences: number;
  confidence: string;   // "HIGH" | "MEDIUM" | "LOW"
}

// GET .../debt/total
export interface TotalDebtResponseDto {
  debts: TotalDebtItemDto[];
  totalEstimatedDebt: number;
  totalMonthlyCommitments: number;
}

export interface TotalDebtItemDto {
  description: string;
  monthlyAmount: number;
  estimatedRemainingMonths: number;
  estimatedRemainingDebt: number;
}

// GET .../debt/monthly-payments
export interface MonthlyPaymentsResponseDto {
  totalMonthlyPayments: number;
  breakdown: MonthlyPaymentsBreakdownDto[];
}

export interface MonthlyPaymentsBreakdownDto {
  description: string;
  amount: number;
  percent: number;
}

// GET .../debt/ratio
export interface DebtRatioResponseDto {
  monthlyIncome: number;
  monthlyDebtPayments: number;
  debtRatio: number;            // pourcentage
  bceaoThreshold: number;       // 33
  label: string;                // "SAIN" | "ATTENTION" | "CRITIQUE"
  score: number;                // 0-100
  margin: number;
  interpretation: string;
}

// GET .../debt/repayment-history
export interface RepaymentHistoryResponseDto {
  monthsAnalyzed: number;
  paymentsOnTime: number;
  regularityRate: number;
  score: number;
  history: RepaymentHistoryItemDto[];
}

export interface RepaymentHistoryItemDto {
  month: string;
  paid: boolean;
  daysFromExpected: number;
}
```

### Épargne

```typescript
// GET .../savings/rate
export interface SavingsRateAnalytics {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyDebtPayments: number;
  netSavings: number;
  savingsRate: number;
  label: string;
  score: number;
  garmanForgueThreshold: number;  // 10
}

// GET .../savings/frequency
export interface SavingsFrequencyAnalytics {
  monthsWithSavings: number;
  totalMonths: number;
  regularityRate: number;
  score: number;
  averageDepositAmount: number;
  depositsByMonth: Array<{
    month: string;
    saved: boolean;
    amount: number;
  }>;
}

// GET .../savings/retention
export interface SavingsRetentionAnalytics {
  averageRetentionDays: number;
  label: string;
  score: number;
  retentionByMonth: Array<{
    month: string;
    retentionDays: number;
  }>;
  interpretation: string;
}
```

### Score financier

```typescript
// GET .../score
export interface GlobalScoreResponse {
  globalScore: number;       // 0-100
  label: string;             // "EXCELLENT" | "BON" | "MOYEN" | "FAIBLE" | "CRITIQUE"
  components: {
    C1_expenses: ScoreComponent;
    C2_debt: ScoreComponent;
    C3_savings: ScoreComponent;
    C4_stability: ScoreComponent;
  };
  interpretations: {
    C1_expenses: ComponentInterpretation;
    C2_debt: ComponentInterpretation;
    C3_savings: ComponentInterpretation;
    C4_stability: ComponentInterpretation;
  };
  methodology: string;
}

export interface ScoreComponent {
  score: number;
  weight: number;
  contribution: number;
}

export interface ComponentInterpretation {
  level: 'CRITIQUE' | 'FAIBLE' | 'MOYEN' | 'BON' | 'EXCELLENT';
  label: string;
  message: string;
  priorities: string[];
}

// GET .../score/explanation
export interface ScoreExplanationResponse {
  globalScore: number;
  strengths: string[];
  weaknesses: string[];
  indicators: ScoreIndicator[];
}

export interface ScoreIndicator {
  name: string;
  value: string;
  score: number;
  impact: 'POSITIF' | 'NEGATIF' | 'NEUTRE';
}

// GET .../score/history
export interface ScoreHistoryResponse {
  history: ScoreHistoryItem[];
  trend: 'UP' | 'DOWN' | 'STABLE';
  improvement: string;
}

export interface ScoreHistoryItem {
  month: string;
  score: number;
  label: string;
}

// GET .../score/recommendations
export interface RecommendationResponse {
  recommendations: Recommendation[];
}

export interface Recommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  component: string;
  trigger: string;
  title: string;
  message: string;
  actionAmount?: number;
  source: string;
}

// GET .../advice
export interface PersonalAdvice {
  type: AdviceInsightType;
  severity: AdviceSeverity;
  title: string;
  message: string;
  action?: string;
  category?: string;
  metric: {
    current: number;
    previous?: number;
    change?: number;
    threshold?: number;
  };
}
```

### Feedback classifieur

```typescript
// POST /analytics/classifier/feedback — Request
export interface ClassifierFeedbackDto {
  customerId: string;
  description: string;
  correctCategory: ExpenseCategory;
}

// POST /analytics/classifier/feedback — Response
export interface ClassifierFeedbackResponse {
  success: boolean;
}
```

---

## Eligibility

### Requêtes

```typescript
// POST /eligibility/evaluate
export interface EvaluateEligibilityDto {
  customerId: string;                    // UUID
  productCode: string;                   // ex: "COMPTES_PART"
  inputs?: Record<string, number | boolean | string>;
  mode?: 'matrix' | 'rules';           // défaut: "matrix"
}
```

### Réponses

```typescript
// POST /eligibility/evaluate — Response
export interface EligibilityResult {
  productCode: string;
  productName: string;
  productDescription: string;
  hasEligibilityRules: boolean;
  globalScore: number;
  maxScore: number;
  scorePercent: number;
  status: 'ELIGIBLE' | 'PARTIAL' | 'NOT_ELIGIBLE';
  ruleResults: RuleResult[];
  infoRules: RuleResult[];       // règles non-ELIGIBILITY (frais, plafonds, taux)
  passedRules: RuleResult[];
  failedRules: RuleResult[];
  partialRules: RuleResult[];
}

export interface RuleResult {
  ruleId: string;
  ruleCode: string;
  label: string;
  status: 'PASS' | 'FAIL' | 'PARTIAL';
  valueSource: 'analytics' | 'input' | 'not_found';
  clientValue: number | boolean | string | null;
  threshold: number | null;
  thresholdMin: number | null;
  thresholdMax: number | null;
  scoreEarned: number;
  scoreMax: number;
  message: string;
  advice: string | null;
}

// GET /eligibility/products — Response
export interface ProductListItem {
  code: string;
  name: string;
  description: string | null;
  category: string;
  _count: { rules: number };
}

// GET /eligibility/products/:code/rules — Response
export interface ProductWithRules {
  code: string;
  name: string;
  description: string | null;
  rules: Array<{
    code: string;
    label: string;
    description?: string;
    type: RuleType;
    field: string;
    operator?: RuleOperator;
    value?: number;
    valueMin?: number;
    valueMax?: number;
    percentage?: number;
    weight: number;
    priority: number;
  }>;
}
```

### Mapping des champs analytics → règles

```typescript
export const ANALYTICS_FIELD_MAP: Record<string, string> = {
  monthlyIncome: 'monthlyIncome',
  debtRatio: 'debtRatio',
  expenseRatio: 'expenseRatio',
  repaymentRegularity: 'repaymentRegularityScore',
  savingsRate: 'savingsRate',
  overdraftDays: 'overdraftDays',
  revenueVolatility: 'revenueVolatilityScore',
  savingsRegularity: 'savingsRegularityScore',
  emergencyFundScore: 'emergencyFundScore',
  balanceVolatility: 'balanceVolatilityScore',
};
```

---

## SMS

```typescript
// POST /sms/sync — Request
export interface SyncSmsDto {
  messages: RawSms[];
}

export interface RawSms {
  id: number;                 // SMS ID from device
  address: string;            // "MTN" | "MOOV" | etc.
  body: string;               // "Vous avez recu 5000 FCFA de..."
  dateSent: string;           // ISO date
}

// POST /sms/sync — Response
export interface SyncResult {
  synced: number;
  duplicates: number;
  skipped: number;
}

// Interne — parsing SMS
export interface ParsedSms {
  operator: string;
  direction: 'DEBIT' | 'CREDIT' | null;
  amount: number | null;
  sender: string | null;
}
```

---

## Mail

```typescript
// GET /mail — Response
export interface MailResponse {
  message: string;  // "Email envoyé avec succès"
}
```

---

## WebSocket

```typescript
// Connexion
const socket = io('http://localhost:4000');

// Événements reçus
export interface HeartbeatEvent {
  time: string;        // "14:30:00"
  status: 'UP';
}

export interface AnalyticsRequestedEvent {
  type: string;
  customerId: string;
}

export interface FeedbackSavedEvent {
  customerId: string;
  description: string;
  correctCategory: string;
}
```

---

## Enums & constantes partagées

```typescript
// Catégories de dépenses (valides pour le feedback classifier)
export enum ExpenseCategory {
  LOGEMENT = 'LOGEMENT',
  ALIMENTATION = 'ALIMENTATION',
  TRANSPORT = 'TRANSPORT',
  SANTE = 'SANTE',
  MOBILE_MONEY = 'MOBILE_MONEY',
  CARBURANT = 'CARBURANT',
  COMMERCE = 'COMMERCE',
  FRAIS_BANCAIRES = 'FRAIS_BANCAIRES',
  VIREMENTS = 'VIREMENTS',
  RETRAITS = 'RETRAITS',
  DEPOTS = 'DEPOTS',
  INTERETS = 'INTERETS',
  CREDIT = 'CREDIT',
  SALAIRE = 'SALAIRE',
  DIVERS = 'DIVERS',
}

export enum RuleType {
  ELIGIBILITY = 'ELIGIBILITY',
  LIMIT = 'LIMIT',
  FEE = 'FEE',
  VALUE_DATE = 'VALUE_DATE',
  INTEREST = 'INTEREST',
}

export enum RuleOperator {
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  EQUALS = 'EQUALS',
  GREATER_OR_EQUAL = 'GREATER_OR_EQUAL',
  LESS_OR_EQUAL = 'LESS_OR_EQUAL',
  BETWEEN = 'BETWEEN',
  NOT_EQUALS = 'NOT_EQUALS',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
}

export enum Currency {
  XOF = 'XOF',
  EUR = 'EUR',
  USD = 'USD',
  GBP = 'GBP',
}

export enum RulePeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  PER_TRANSACTION = 'PER_TRANSACTION',
}

export enum UserRole {
  CLIENT = 'CLIENT',
  AGENT = 'AGENT',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
  REVERSED = 'REVERSED',
  POSTED = 'POSTED',
  FAILED = 'FAILED',
}

export type Trend = 'UP' | 'DOWN' | 'STABLE';

export type ScoreLabel = 'EXCELLENT' | 'BON' | 'MOYEN' | 'FAIBLE' | 'CRITIQUE';

export type AdviceSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type AdviceInsightType =
  | 'SPENDING_SPIKE'
  | 'TOP_CATEGORY'
  | 'SAVINGS_DROP'
  | 'OVERDRAFT_RISK'
  | 'HIGH_EXPENSE_RATIO'
  | 'SUBSCRIPTION_BLOAT'
  | 'DEBT_WARNING'
  | 'INCOME_DROP'
  | 'BALANCE_LOW'
  | 'GOOD_HABIT';
```

---

## Plans de réponse HTTP

| Status | Signification |
|--------|---------------|
| `200` | Succès |
| `201` | Créé (register final step) |
| `400` | Erreur de validation |
| `401` | Non authentifié (token manquant/invalide) |
| `403` | Accès refusé (rôle insuffisant) |
| `404` | Ressource non trouvée |
| `409` | Conflit (email déjà utilisé, etc.) |
| `429` | Trop de requêtes |
| `500` | Erreur serveur |

---

## Notifications

### Endpoints admin (prefixe: `/api/admin`)

```typescript
// GET /api/admin/notifications/stats
export interface NotificationStats {
  totalNotifications: number;
  totalPushTokens: number;
  unreadCount: number;
  totalScheduled: number;
}

// POST /api/admin/notifications/broadcast
export interface BroadcastDto {
  title: string;
  body: string;
  type?: 'ADMIN_BROADCAST' | 'ADVICE' | 'EDUCATIONAL' | 'SYSTEM';  // defaut ADMIN_BROADCAST
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';                       // defaut INFO
  target?: 'all' | string[];                                        // defaut 'all'
  customerTargets?: string[];                                        // IDs ou emails BankCustomer
}

// DELETE /api/admin/notifications (purge)
export interface PurgeNotificationsDto {
  type?: string;    // ne supprimer que ce type
  before?: string;  // ne supprimer que les notifications avant cette date (ISO)
}

// GET /api/admin/notifications/scheduled
export type ScheduledNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  severity: string;
  scheduledAt: string;      // ISO date
  recurrence: string | null; // null | 'DAILY' | 'WEEKLY' | 'MONTHLY'
  lastSentAt: string | null;
  active: boolean;
  targetType: 'all' | 'user_ids' | 'customer_targets';
  targetIds: string[] | null;
  createdAt: string;
  updatedAt: string;
};

// POST /api/admin/notifications/scheduled
export interface CreateScheduledNotificationDto {
  title: string;
  body: string;
  type?: string;             // defaut ADMIN_BROADCAST
  severity?: string;         // defaut INFO
  scheduledAt: string;       // ISO date (future = programme)
  recurrence?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  targetType?: 'all' | 'user_ids' | 'customer_targets'; // defaut 'all'
  targetIds?: string[];
}

// PATCH /api/admin/notifications/scheduled/:id
export type UpdateScheduledNotificationDto = Partial<CreateScheduledNotificationDto> & {
  active?: boolean;
};

// DELETE /api/admin/notifications/scheduled/:id
```

### Endpoints utilisateur (prefixe: `/notifications`)

```typescript
// GET /notifications?page=1&limit=20&unreadOnly=false
export interface NotificationHistory {
  items: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  channel: 'PUSH' | 'IN_APP' | 'EMAIL';
  title: string;
  body: string;
  data: any;
  severity: string | null;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

// GET /notifications/unread
// PATCH /notifications/:id/read
// POST /notifications/read-all
// GET /notifications/preferences
// PATCH /notifications/preferences
export interface NotificationPreferences {
  push: boolean;
  email: boolean;
  types: string[] | null;
}

export interface UpdatePrefsDto {
  push?: boolean;
  email?: boolean;
  types?: string[];
}

// POST /notifications/push/register
export interface RegisterPushTokenDto {
  token: string;         // Expo push token
  platform?: 'ios' | 'android' | 'web';
}

// POST /notifications/push/unregister
export interface UnregisterPushTokenDto {
  token: string;
}
```

---

## MFA (Multi-Factor Authentication)

```typescript
// POST /auth/mfa/enable
export interface EnableMfaResponseDto {
  secret: string;   // secret TOTP (a sauvegarder)
  uri: string;      // otpauth:// URI pour QR code
}

// POST /auth/mfa/verify
export interface VerifyMfaDto {
  code: string;     // 6 chiffres TOTP
}

// POST /auth/mfa/disable
export interface DisableMfaDto {
  password: string; // confirmation mot de passe
}

// GET /auth/mfa/status
export type MfaStatusResponseDto = {
  enabled: boolean;
  method: 'TOTP' | null;
};

// POST /auth/login/mfa (deuxieme etape login)
export interface MfaLoginDto {
  mfaToken: string;  // token temporaire recu au login
  code: string;      // 6 chiffres TOTP
}
```

---

## Logs (admin)

### Authentification logs (prefixe: `/api/admin`)

```typescript
// GET /api/admin/auth-logs?userId=&action=&success=&from=&to=&page=&limit=
export interface AuthLogList {
  data: AuthLogItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AuthLogItem {
  id: string;
  userId: string | null;
  email: string | null;
  action: string;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// GET /api/admin/auth-logs/:id
// DELETE /api/admin/auth-logs (purge, avec filtres)
export interface PurgeLogsDto {
  before?: string;  // ISO date, supprime les logs avant cette date
}
```

### Audit logs (prefixe: `/api/admin`)

```typescript
// GET /api/admin/audit-logs?entityType=&entityId=&action=&actorId=&from=&to=&page=&limit=
export interface AuditLogList {
  data: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLogItem {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string | null;
  actorRole: string | null;
  before: any;
  after: any;
  ipAddress: string | null;
  createdAt: string;
}

// DELETE /api/admin/audit-logs (purge, avec filtres)
```

---

## WebSocket

```typescript
// Gateway: /notifications (avec JWT en handshake)
// Rooms: user:{userId}

// Gateway: /admin (dashboard temps reel)
// Evenements:
// - heartbeat: { timestamp: string, users: number, ... }
```
